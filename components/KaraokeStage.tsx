
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, UserSettings, ThemeConfig } from '../types';
import { createRenderer, isGraphicsFormat, KaraokeRenderer, LyricsDisplay } from '../formats';
import { usePitchDetection } from '../hooks/usePitchDetection';
import PitchMeter from './PitchMeter';
import SingingSummary from './SingingSummary';

interface KaraokeStageProps {
  song: Song;
  settings: UserSettings;
  onExit: () => void;
  theme: ThemeConfig;
  /** Callback to trigger confetti burst */
  onConfetti?: () => void;
}

const KaraokeStage: React.FC<KaraokeStageProps> = ({ song, settings, onExit, theme, onConfetti }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.duration || 0);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricsDisplay | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showPitchMeter, setShowPitchMeter] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const rendererRef = useRef<KaraokeRenderer | null>(null);
  const audioConnectedRef = useRef(false);
  const lastLyricsKeyRef = useRef('');
  const lastTimeUpdateRef = useRef(0);

  // Apply the backing-track volume from settings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, settings.backingVolume / 100));
    }
  }, [settings.backingVolume, isReady]);

  // Pitch detection hook
  const {
    pitch,
    stats,
    enableMic,
    disableMic,
    connectReferenceAudio,
    resetStats,
    onStreakConfetti,
  } = usePitchDetection();

  // Register confetti callback
  useEffect(() => {
    if (onConfetti) {
      onStreakConfetti(onConfetti);
    }
  }, [onConfetti, onStreakConfetti]);

  // Determine if this song uses graphics (CDG) or text (LRC) format
  const isGraphics = isGraphicsFormat(song.lyricsFormat || 'cdg');

  // Initialize renderer when song changes
  useEffect(() => {
    // Support both new lyricsData and legacy cdgData
    const data = song.lyricsData || song.cdgData;
    const format = song.lyricsFormat || 'cdg';
    
    if (data) {
      try {
        rendererRef.current = createRenderer(format, data);
        console.log(`[KaraokeStage] Initialized ${format.toUpperCase()} renderer for song:`, song.id);
      } catch (err) {
        console.error(`[KaraokeStage] Failed to initialize renderer:`, err);
        setError(`Failed to load ${format.toUpperCase()} data`);
      }
    }
    
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [song.id, song.lyricsData, song.cdgData, song.lyricsFormat]);

  // Connect audio element for pitch detection once the mic is on.
  // Connecting eagerly would route playback through an AudioContext created
  // outside a user gesture, which autoplay policy may leave suspended — silencing the song.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && isReady && pitch.micEnabled && !audioConnectedRef.current) {
      connectReferenceAudio(audio);
      audioConnectedRef.current = true;
    }
  }, [isReady, pitch.micEnabled, connectReferenceAudio]);

  const renderFrame = useCallback((time: number) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const result = renderer.render(time);
    if (!result.hasContent) return;

    if (isGraphics && result.imageData) {
      // Graphics format (CDG) - render to canvas. putImageData is synchronous,
      // so frames can't land out of order and nothing is left for GC
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (!ctxRef.current) {
        ctxRef.current = canvas.getContext('2d');
      }
      ctxRef.current?.putImageData(result.imageData, 0, 0);
    } else if (result.lyrics) {
      // Text format (LRC) — only push through React state when the visible
      // content changes, not on every animation frame
      const l = result.lyrics;
      const key = `${l.currentLine}|${l.currentWordIndex ?? -1}|${Math.round(l.lineProgress * 50)}`;
      if (key !== lastLyricsKeyRef.current) {
        lastLyricsKeyRef.current = key;
        setLyrics(l);
      }
    }
  }, [isGraphics]);

  const tick = useCallback(() => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    // The m:ss clock and progress bar don't need 60 Hz re-renders
    if (Math.abs(time - lastTimeUpdateRef.current) > 0.25) {
      lastTimeUpdateRef.current = time;
      setCurrentTime(time);
    }
    renderFrame(time);
    rafRef.current = requestAnimationFrame(tick);
  }, [renderFrame]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, tick]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch((e: Error) => {
          console.error("Playback blocked", e);
          setError("Interaction required. Click play to start!");
        });
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    // The duration state is 0 until loadedmetadata; fall back to the element's
    const max = duration || audio.duration || 0;
    const t = Math.max(0, Math.min(max, time));
    audio.currentTime = t;
    // Keep the display in sync when paused — the rAF loop isn't running then
    lastTimeUpdateRef.current = t;
    setCurrentTime(t);
    renderFrame(t);
  };

  const handleSongEnd = () => {
    setIsPlaying(false);
    setShowSummary(true);
  };

  const handleSingAgain = () => {
    setShowSummary(false);
    resetStats();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e: Error) => {
        console.error("Playback blocked", e);
        setError("Interaction required. Click play to start!");
      });
    }
  };

  const handleMicToggle = async () => {
    if (pitch.micEnabled) {
      disableMic();
    } else {
      await enableMic();
    }
  };

  // Render lyrics for text-based formats (LRC)
  const renderLyricsDisplay = () => {
    if (!lyrics) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 text-2xl">
          Waiting for lyrics...
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center space-y-6">
        {/* Previous line (dimmed) */}
        {lyrics.previousLine && (
          <p className="text-2xl text-gray-500 opacity-50 transition-all">
            {lyrics.previousLine}
          </p>
        )}
        
        {/* Current line (highlighted) */}
        <p 
          className="text-4xl md:text-5xl font-bold text-white transition-all"
          style={{ 
            textShadow: `0 0 30px ${theme.primaryHex}, 0 0 60px ${theme.primaryHex}40`
          }}
        >
          {lyrics.words ? (
            // Word-by-word highlighting for enhanced LRC \u2014 the renderer's timed
            // segments may be syllables, so render those rather than re-splitting text
            lyrics.words.map((segment: string, i: number) => (
              <span
                key={i}
                className={i <= (lyrics.currentWordIndex ?? -1) ? 'opacity-100' : 'opacity-40'}
              >
                {segment}
              </span>
            ))
          ) : (
            lyrics.currentLine || '\u00A0' // Non-breaking space if empty
          )}
        </p>
        
        {/* Next line (preview) */}
        {lyrics.nextLine && (
          <p className="text-xl text-gray-400 opacity-70 transition-all">
            {lyrics.nextLine}
          </p>
        )}
        
        {/* Progress bar for current line */}
        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden mt-4">
          <div 
            className="h-full transition-all duration-100"
            style={{ 
              width: `${lyrics.lineProgress * 100}%`,
              backgroundColor: theme.primaryHex 
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col p-4 overflow-hidden select-none">
      <audio 
        ref={audioRef} 
        src={song.audioUrl} 
        onEnded={handleSongEnd}
        onCanPlay={() => setIsReady(true)}
        onLoadedMetadata={(e: React.SyntheticEvent<HTMLAudioElement>) => setDuration(e.currentTarget.duration)}
        onError={() => setError("Error loading media file. The stored audio may be corrupt or not a valid MP3 — try deleting and re-importing the song.")}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-4 relative z-20 px-4">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white leading-tight truncate">{song.title}</h2>
            <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest">
              {theme.name} Studio Mode ({(song.lyricsFormat || 'cdg').toUpperCase()})
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Mic toggle button */}
          <button 
            onClick={handleMicToggle}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
              pitch.micEnabled 
                ? 'bg-green-600 hover:bg-green-500 border-green-500 text-white' 
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
            }`}
            title={pitch.micEnabled ? 'Disable microphone' : 'Enable microphone for scoring'}
          >
            {pitch.micEnabled ? '🎤 Mic On' : '🎤 Enable Mic'}
          </button>
          
          {/* Pitch meter toggle */}
          {pitch.micEnabled && (
            <button 
              onClick={() => setShowPitchMeter(!showPitchMeter)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                showPitchMeter 
                  ? 'bg-white/20 border-white/20 text-white' 
                  : 'bg-white/10 hover:bg-white/20 border-white/10 text-gray-400'
              }`}
              title={showPitchMeter ? 'Hide pitch meter' : 'Show pitch meter'}
            >
              📊
            </button>
          )}
          
          <button onClick={onExit} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full text-sm font-bold transition-all border border-white/10">
            Exit Room
          </button>
        </div>
      </div>

      {/* Mic error banner */}
      {pitch.error && (
        <div className="relative z-20 self-center bg-red-600/90 text-white text-sm font-bold px-6 py-2 rounded-full mb-2">
          {pitch.error}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
              e.preventDefault();
              togglePlay();
            }
          }}
          className="relative w-full max-w-5xl aspect-[300/216] bg-slate-900 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.9)] border-4 border-slate-800 overflow-hidden cursor-pointer group"
        >
          {/* Graphics display (CDG) */}
          {isGraphics && (
            <canvas 
              ref={canvasRef} 
              width={300} 
              height={216} 
              className="w-full h-full" 
              style={{ imageRendering: 'pixelated' }} 
            />
          )}
          
          {/* Lyrics display (LRC) */}
          {!isGraphics && (
            <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
              {renderLyricsDisplay()}
            </div>
          )}

          {!isReady && !error && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white">
              <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: `${theme.primaryHex} #00000000 #00000000 #00000000` }}></div>
              <p className="font-bold tracking-widest text-sm uppercase">Optimizing Stream...</p>
            </div>
          )}

          {isReady && !isPlaying && !error && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
              <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all group-hover:scale-110" style={{ backgroundColor: theme.primaryHex }}>
                <svg className="w-12 h-12 translate-x-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
              </div>
              <p className="mt-8 font-bold text-xl tracking-widest uppercase bg-black/60 px-10 py-4 rounded-full border border-white/10">Tap to Start Show</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center text-white p-10 text-center">
              <p className="font-bold text-2xl mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="bg-white text-red-950 px-8 py-3 rounded-full font-bold">Refresh Page</button>
            </div>
          )}
        </div>

        {/* Pitch Meter - below the video */}
        {pitch.micEnabled && (
          <div className="w-full max-w-md mt-6">
            <PitchMeter
              matchScore={pitch.matchScore}
              direction={pitch.direction}
              streak={pitch.streak}
              isListening={pitch.isListening}
              isVisible={showPitchMeter}
              isDark={true}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="max-w-4xl w-full mx-auto mt-6 bg-slate-900/90 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-30">
        <div className="flex items-center space-x-6 mb-4 px-2">
          <span className="text-[10px] font-mono text-gray-500 w-12 text-right">{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
          <div
            className="flex-1 h-3 bg-black/60 rounded-full overflow-hidden cursor-pointer"
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={`${Math.floor(currentTime / 60)}:${(Math.floor(currentTime % 60)).toString().padStart(2, '0')}`}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); seek(currentTime + 5); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); seek(currentTime - 5); }
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * duration);
          }}>
            <div className="h-full transition-all duration-100" style={{ width: `${(currentTime / (duration || 1)) * 100}%`, backgroundColor: theme.primaryHex }}></div>
          </div>
          <span className="text-[10px] font-mono text-gray-500 w-12">{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
        </div>

        <div className="flex justify-center items-center space-x-12">
          <button onClick={() => seek(currentTime - 10)} className="text-gray-400 hover:text-white transition-all transform hover:scale-125">
             <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4zM16.445 14.832A1 1 0 0018 14V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"></path></svg>
          </button>
          
          <button onClick={togglePlay} className="w-24 h-24 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 shadow-2xl" style={{ backgroundColor: theme.primaryHex }}>
             {isPlaying ? <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg> : <svg className="w-12 h-12 translate-x-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>}
          </button>

          <button onClick={() => seek(currentTime + 10)} className="text-gray-400 hover:text-white transition-all transform hover:scale-125">
             <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4zM11.555 5.168A1 1 0 0010 6v8a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z"></path></svg>
          </button>
        </div>

        {/* Live score display when mic is enabled */}
        {pitch.micEnabled && stats.totalSamples > 0 && (
          <div className="text-center mt-4 text-sm text-gray-400">
            Current Score: <span className="text-white font-bold">{stats.percentage}%</span>
            {stats.bestStreak > 5 && (
              <span className="ml-4">Best Streak: <span className="text-yellow-400 font-bold">{stats.bestStreak}</span> 🔥</span>
            )}
          </div>
        )}
      </div>

      {/* Summary modal */}
      {showSummary && (
        <SingingSummary
          percentage={stats.percentage}
          bestStreak={stats.bestStreak}
          totalSamples={stats.totalSamples}
          onSingAgain={handleSingAgain}
          onBack={onExit}
          primaryColor={theme.primaryHex}
          isDark={true}
        />
      )}
    </div>
  );
};

export default KaraokeStage;
