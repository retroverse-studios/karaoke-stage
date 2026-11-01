/**
 * usePitchDetection Hook
 * 
 * Manages microphone input and real-time pitch detection.
 * Compares singer's pitch to reference audio and tracks scoring.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { detectPitch, calculatePitchMatch, getPitchDirection } from '../utils/pitchDetection';

export interface PitchState {
  /** Singer's current frequency in Hz */
  singerPitch: number | null;
  /** Reference audio's current frequency in Hz */
  referencePitch: number | null;
  /** How well pitches match (0-1) */
  matchScore: number;
  /** Direction: -1 (flat), 0 (on pitch), 1 (sharp) */
  direction: number;
  /** Current streak of good notes */
  streak: number;
  /** Is microphone enabled */
  micEnabled: boolean;
  /** Is mic currently listening */
  isListening: boolean;
  /** Error message if mic access failed */
  error: string | null;
}

export interface PitchStats {
  /** Total samples taken */
  totalSamples: number;
  /** Samples where singer was in tune (>70% match) */
  inTuneSamples: number;
  /** Overall percentage score */
  percentage: number;
  /** Best streak achieved */
  bestStreak: number;
}

export interface UsePitchDetectionReturn {
  /** Current pitch state */
  pitch: PitchState;
  /** Cumulative stats for scoring */
  stats: PitchStats;
  /** Enable microphone and start listening */
  enableMic: () => Promise<void>;
  /** Disable microphone */
  disableMic: () => void;
  /** Connect reference audio element for comparison */
  connectReferenceAudio: (audioElement: HTMLAudioElement) => void;
  /** Reset stats (call at start of song) */
  resetStats: () => void;
  /** Trigger confetti callback when streak hits threshold */
  onStreakConfetti: ((callback: () => void) => void);
}

const STREAK_THRESHOLD_FOR_CONFETTI = 10; // Trigger confetti every 10 good notes in a row
const IN_TUNE_THRESHOLD = 0.7; // 70% match = "in tune"

export function usePitchDetection(): UsePitchDetectionReturn {
  const [pitch, setPitch] = useState<PitchState>({
    singerPitch: null,
    referencePitch: null,
    matchScore: 0,
    direction: 0,
    streak: 0,
    micEnabled: false,
    isListening: false,
    error: null,
  });

  const [stats, setStats] = useState<PitchStats>({
    totalSamples: 0,
    inTuneSamples: 0,
    percentage: 0,
    bestStreak: 0,
  });

  // Audio context and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const refAnalyserRef = useRef<AnalyserNode | null>(null);
  const refSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streakConfettiCallbackRef = useRef<(() => void) | null>(null);
  const lastStreakConfettiRef = useRef<number>(0);
  // Streak lives in a ref because the analysis loop closure is created once
  // (from enableMic) and would otherwise read a stale pitch.streak forever
  const streakRef = useRef<number>(0);
  // Guards against a rapid second click while getUserMedia is in flight,
  // which would leak a stream and stack a second analysis loop
  const enablingMicRef = useRef(false);
  const bestStreakRef = useRef<number>(0);
  // Per-frame sample counts, flushed to React state at a lower rate
  const statsAccumRef = useRef({ total: 0, inTune: 0 });
  const frameCounterRef = useRef(0);
  // Reused per-frame buffers (~8 KB each; allocating fresh ones 120x/sec is pure GC churn)
  const micBufferRef = useRef<Float32Array | null>(null);
  const refBufferRef = useRef<Float32Array | null>(null);

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Enable microphone
  const enableMic = useCallback(async () => {
    if (enablingMicRef.current || micStreamRef.current) return;
    enablingMicRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      micStreamRef.current = stream;

      const audioContext = getAudioContext();
      // Runs inside a user gesture: safe place to resume a context that the
      // browser's autoplay policy started in the suspended state
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      micAnalyserRef.current = analyser;
      
      setPitch(prev => ({ ...prev, micEnabled: true, isListening: true, error: null }));
      
      // Start the analysis loop
      startAnalysisLoop();
    } catch (err) {
      console.error('Failed to access microphone:', err);
      setPitch(prev => ({ 
        ...prev, 
        error: 'Could not access microphone. Please check permissions.' 
      }));
    } finally {
      enablingMicRef.current = false;
    }
  }, [getAudioContext]);

  // Disable microphone
  const disableMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    micAnalyserRef.current = null;
    
    setPitch(prev => ({ 
      ...prev, 
      micEnabled: false, 
      isListening: false,
      singerPitch: null,
      matchScore: 0,
      direction: 0,
    }));
  }, []);

  // Connect reference audio (MP3 player)
  const connectReferenceAudio = useCallback((audioElement: HTMLAudioElement) => {
    try {
      const audioContext = getAudioContext();

      // Check if already connected
      if (refSourceRef.current) {
        return;
      }

      // A suspended context silences any element routed through it
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const source = audioContext.createMediaElementSource(audioElement);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      analyser.connect(audioContext.destination); // Still output to speakers
      
      refSourceRef.current = source;
      refAnalyserRef.current = analyser;
    } catch (err) {
      console.error('Failed to connect reference audio:', err);
    }
  }, [getAudioContext]);

  // Analysis loop
  const startAnalysisLoop = useCallback(() => {
    const analyze = () => {
      const micAnalyser = micAnalyserRef.current;
      const refAnalyser = refAnalyserRef.current;
      const audioContext = audioContextRef.current;
      
      if (!micAnalyser || !audioContext) {
        animationFrameRef.current = requestAnimationFrame(analyze);
        return;
      }
      
      // Get singer's pitch
      if (!micBufferRef.current || micBufferRef.current.length !== micAnalyser.fftSize) {
        micBufferRef.current = new Float32Array(micAnalyser.fftSize);
      }
      const micBuffer = micBufferRef.current;
      micAnalyser.getFloatTimeDomainData(micBuffer);
      const singerPitch = detectPitch(micBuffer, audioContext.sampleRate);

      // Get reference pitch (if available)
      let referencePitch: number | null = null;
      if (refAnalyser) {
        if (!refBufferRef.current || refBufferRef.current.length !== refAnalyser.fftSize) {
          refBufferRef.current = new Float32Array(refAnalyser.fftSize);
        }
        const refBuffer = refBufferRef.current;
        refAnalyser.getFloatTimeDomainData(refBuffer);
        referencePitch = detectPitch(refBuffer, audioContext.sampleRate);
      }
      
      // Calculate match score and direction
      let matchScore = 0;
      let direction = 0;
      
      if (singerPitch && referencePitch) {
        matchScore = calculatePitchMatch(singerPitch, referencePitch);
        direction = getPitchDirection(singerPitch, referencePitch);
      }
      
      const isInTune = matchScore >= IN_TUNE_THRESHOLD;
      const newStreak = isInTune ? streakRef.current + 1 : 0;
      streakRef.current = newStreak;
      if (newStreak > bestStreakRef.current) {
        bestStreakRef.current = newStreak;
      }

      // Check for confetti trigger
      if (newStreak > 0 &&
          newStreak % STREAK_THRESHOLD_FOR_CONFETTI === 0 &&
          newStreak !== lastStreakConfettiRef.current) {
        lastStreakConfettiRef.current = newStreak;
        streakConfettiCallbackRef.current?.();
      }

      // Count stats — only when both singer and backing track have a detectable
      // pitch; scoring instrumental/no-reference passages would penalize the singer
      if (singerPitch && referencePitch) {
        statsAccumRef.current.total++;
        if (isInTune) statsAccumRef.current.inTune++;
      }

      // Flush to React state at ~15 Hz — re-rendering the whole stage at 60 Hz
      // is wasted work for a meter and score readout
      frameCounterRef.current++;
      if (frameCounterRef.current % 4 === 0) {
        setPitch(prev => ({
          ...prev,
          singerPitch,
          referencePitch,
          matchScore,
          direction,
          streak: newStreak,
        }));

        const acc = statsAccumRef.current;
        if (acc.total > 0) {
          statsAccumRef.current = { total: 0, inTune: 0 };
          setStats(prev => {
            const newTotal = prev.totalSamples + acc.total;
            const newInTune = prev.inTuneSamples + acc.inTune;
            return {
              totalSamples: newTotal,
              inTuneSamples: newInTune,
              percentage: Math.round((newInTune / newTotal) * 100),
              bestStreak: Math.max(prev.bestStreak, bestStreakRef.current),
            };
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, []);

  // Reset stats
  const resetStats = useCallback(() => {
    setStats({
      totalSamples: 0,
      inTuneSamples: 0,
      percentage: 0,
      bestStreak: 0,
    });
    setPitch(prev => ({ ...prev, streak: 0 }));
    lastStreakConfettiRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    statsAccumRef.current = { total: 0, inTune: 0 };
  }, []);

  // Register confetti callback
  const onStreakConfetti = useCallback((callback: () => void) => {
    streakConfettiCallbackRef.current = callback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableMic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        // Null everything tied to the closed context so a remount
        // (e.g. StrictMode's double-mount) builds a fresh graph
        audioContextRef.current = null;
      }
      refSourceRef.current = null;
      refAnalyserRef.current = null;
    };
  }, [disableMic]);

  return {
    pitch,
    stats,
    enableMic,
    disableMic,
    connectReferenceAudio,
    resetStats,
    onStreakConfetti,
  };
}
