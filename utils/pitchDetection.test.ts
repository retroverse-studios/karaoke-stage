import { describe, it, expect } from 'vitest';
import { detectPitch, frequencyToNote, calculatePitchMatch, getPitchDirection } from './pitchDetection';

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 2048;

function sine(freq: number, amplitude = 0.5): Float32Array {
  const buf = new Float32Array(BUFFER_SIZE);
  for (let i = 0; i < BUFFER_SIZE; i++) {
    buf[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return buf;
}

function addInPlace(target: Float32Array, other: Float32Array): Float32Array {
  for (let i = 0; i < target.length; i++) target[i] += other[i];
  return target;
}

describe('detectPitch', () => {
  it('detects a pure 220 Hz tone', () => {
    const pitch = detectPitch(sine(220), SAMPLE_RATE);
    expect(pitch).not.toBeNull();
    expect(pitch!).toBeCloseTo(220, 0);
  });

  it('detects a pure 440 Hz tone', () => {
    const pitch = detectPitch(sine(440), SAMPLE_RATE);
    expect(pitch!).toBeCloseTo(440, 0);
  });

  it('detects the fundamental (not the octave) when the 2nd harmonic is strong', () => {
    // A voice-like signal: 110 Hz fundamental with a nearly-as-strong 2nd harmonic.
    // Un-normalized autocorrelation is biased toward the shorter lag and reports 220 Hz.
    const signal = addInPlace(sine(110, 0.5), sine(220, 0.45));
    const pitch = detectPitch(signal, SAMPLE_RATE);
    expect(pitch).not.toBeNull();
    expect(pitch!).toBeGreaterThan(100);
    expect(pitch!).toBeLessThan(120);
  });

  it('returns null for silence', () => {
    expect(detectPitch(new Float32Array(BUFFER_SIZE), SAMPLE_RATE)).toBeNull();
  });

  it('returns null for a signal below the noise gate', () => {
    expect(detectPitch(sine(220, 0.005), SAMPLE_RATE)).toBeNull();
  });

  it('respects the frequency search range', () => {
    // 50 Hz is below the default 80 Hz floor; its true lag is outside the search
    // window, so whatever is reported must stay within the configured range
    const pitch = detectPitch(sine(50), SAMPLE_RATE, 80, 1000);
    if (pitch !== null) {
      expect(pitch).toBeGreaterThanOrEqual(79);
      expect(pitch).toBeLessThanOrEqual(1001);
    }
  });
});

describe('frequencyToNote', () => {
  it.each([
    [440, 'A', 4],
    [523.25, 'C', 5],
    [261.63, 'C', 4],
    [392, 'G', 4],
    [880, 'A', 5],
    [246.94, 'B', 3],
  ])('%f Hz -> %s%i', (freq, note, octave) => {
    const result = frequencyToNote(freq as number);
    expect(result.note).toBe(note);
    expect(result.octave).toBe(octave);
  });

  it('reports cents deviation', () => {
    const result = frequencyToNote(445); // slightly sharp A4
    expect(result.note).toBe('A');
    expect(result.cents).toBeGreaterThan(0);
    expect(result.cents).toBeLessThan(50);
  });
});

describe('calculatePitchMatch', () => {
  it('scores identical pitches as a perfect match', () => {
    expect(calculatePitchMatch(220, 220)).toBe(1);
  });

  it('scores an octave apart as in tune (octave equivalence)', () => {
    expect(calculatePitchMatch(440, 220)).toBe(1);
    expect(calculatePitchMatch(110, 220)).toBe(1);
    expect(calculatePitchMatch(446, 223)).toBeGreaterThan(0.9);
  });

  it('still scores a wrong note an octave away as poor', () => {
    // 493.88 Hz (B4) vs 220 Hz (A3): two semitones off after folding
    expect(calculatePitchMatch(493.88, 220)).toBeLessThan(0.1);
    // 466.16 Hz (A#4) vs A3: one semitone off after folding
    expect(calculatePitchMatch(466.16, 220)).toBeCloseTo(0.5, 1);
  });

  it('degrades with distance', () => {
    const close = calculatePitchMatch(440, 445);
    const far = calculatePitchMatch(440, 480);
    expect(close).toBeGreaterThan(far);
  });

  it('returns 0 when either pitch is missing', () => {
    expect(calculatePitchMatch(0, 220)).toBe(0);
    expect(calculatePitchMatch(220, 0)).toBe(0);
  });
});

describe('getPitchDirection', () => {
  it('reports on-pitch within ~30 cents', () => {
    expect(getPitchDirection(440, 440)).toBe(0);
  });

  it('reports sharp and flat', () => {
    expect(getPitchDirection(480, 440)).toBe(1);
    expect(getPitchDirection(400, 440)).toBe(-1);
  });

  it('reports on-pitch an octave away', () => {
    expect(getPitchDirection(220, 440)).toBe(0);
    expect(getPitchDirection(226, 440)).toBe(1); // sharp of the lower octave
  });
});
