/**
 * Pitch Detection Utilities
 * 
 * Uses autocorrelation algorithm to detect the fundamental frequency (pitch)
 * from audio data. This is a real-time pitch detection suitable for voice.
 */

/**
 * Detect pitch using autocorrelation algorithm
 * Returns frequency in Hz, or null if no clear pitch detected
 */
export function detectPitch(
  audioData: Float32Array,
  sampleRate: number,
  minFreq: number = 80,   // Lowest frequency to detect (Hz) - low male voice
  maxFreq: number = 1000  // Highest frequency to detect (Hz) - high female voice
): number | null {
  const bufferSize = audioData.length;
  
  // Check if there's enough signal (not silence)
  let rms = 0;
  for (let i = 0; i < bufferSize; i++) {
    rms += audioData[i] * audioData[i];
  }
  rms = Math.sqrt(rms / bufferSize);
  
  // If signal is too quiet, return null
  if (rms < 0.01) {
    return null;
  }

  // Convert frequency bounds to lag bounds
  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
  const maxLag = Math.min(bufferSize - 2, Math.ceil(sampleRate / minFreq));

  // Autocorrelation, normalized by overlap length and computed only up to the
  // lags we need (+1 for parabolic interpolation). Without normalization the
  // shrinking overlap window biases toward short lags, causing octave-up errors.
  const correlations = new Float32Array(maxLag + 2);

  for (let lag = 0; lag <= maxLag + 1; lag++) {
    let sum = 0;
    const overlap = bufferSize - lag;
    for (let i = 0; i < overlap; i++) {
      sum += audioData[i] * audioData[i + lag];
    }
    correlations[lag] = sum / overlap;
  }

  // Skip the zero-lag main lobe: only start searching once the correlation has
  // dipped below zero, so broadband noise doesn't register as a high pitch
  let searchStart = minLag;
  for (let lag = 1; lag <= maxLag; lag++) {
    if (correlations[lag] < 0) {
      searchStart = Math.max(searchStart, lag);
      break;
    }
  }

  // For a periodic signal every multiple of the true period correlates equally
  // well, so the global max can land on a subharmonic (octave-down error).
  // Instead, take the SHORTEST-lag local peak that comes close to the global max.
  let globalMax = -Infinity;
  for (let lag = searchStart; lag <= maxLag; lag++) {
    if (correlations[lag] > globalMax) {
      globalMax = correlations[lag];
    }
  }

  let bestLag = -1;
  let bestCorrelation = -1;
  for (let lag = searchStart; lag <= maxLag; lag++) {
    const isLocalPeak =
      correlations[lag] >= correlations[lag - 1] &&
      correlations[lag] >= correlations[lag + 1];
    if (isLocalPeak && correlations[lag] >= globalMax * 0.9) {
      bestLag = lag;
      bestCorrelation = correlations[lag];
      break;
    }
  }

  // Validate that we found a good peak (correlations[0] is the signal energy)
  if (bestLag === -1 || bestCorrelation < correlations[0] * 0.3) {
    return null;
  }

  // Parabolic interpolation for sub-sample accuracy
  const prev = correlations[bestLag - 1];
  const curr = correlations[bestLag];
  const next = correlations[bestLag + 1];

  const shift = (prev - next) / (2 * (prev - 2 * curr + next));
  const refinedLag = bestLag + (isFinite(shift) ? shift : 0);

  // Convert lag to frequency
  const frequency = sampleRate / refinedLag;

  return frequency;
}

/**
 * Convert frequency (Hz) to musical note name
 */
export function frequencyToNote(frequency: number): { note: string; octave: number; cents: number } {
  // A4 = 440 Hz
  const A4 = 440;
  const A4_INDEX = 49; // A4 is the 49th key on a piano (1-indexed)
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Calculate how many semitones from A4
  const semitonesFromA4 = 12 * Math.log2(frequency / A4);
  const roundedSemitones = Math.round(semitonesFromA4);
  
  // Calculate cents (how far off from the nearest note)
  const cents = Math.round((semitonesFromA4 - roundedSemitones) * 100);
  
  // Calculate note index and octave
  const noteIndex = (roundedSemitones + 9 + 12 * 10) % 12; // +9 because A is index 9
  // Piano key number of the target note is A4_INDEX + semitones; octaves
  // change at C, which is key 4 of each octave block (A0=1, B0=3, C1=4)
  const octave = Math.floor((A4_INDEX + roundedSemitones + 8) / 12);
  
  return {
    note: noteNames[noteIndex],
    octave,
    cents
  };
}

/**
 * Calculate how "in tune" two frequencies are
 * Returns a value from 0 (completely off) to 1 (perfect match)
 * 
 * Uses semitone distance - within half a semitone is considered "in tune"
 */
/**
 * Semitone distance between two frequencies, folded modulo the octave into
 * [-6, 6): singing the right note an octave away (e.g. a male singer
 * following a female guide vocal) counts as in tune.
 */
export function octaveFoldedSemitoneDiff(singerFreq: number, referenceFreq: number): number {
  const diff = 12 * Math.log2(singerFreq / referenceFreq);
  return ((diff + 6) % 12 + 12) % 12 - 6;
}

export function calculatePitchMatch(singerFreq: number, referenceFreq: number): number {
  if (!singerFreq || !referenceFreq) return 0;

  // Calculate semitone difference (octave-equivalent)
  const semitoneDiff = Math.abs(octaveFoldedSemitoneDiff(singerFreq, referenceFreq));
  
  // Within 0.5 semitones = perfect (100%)
  // 1 semitone off = 50%
  // 2+ semitones off = 0%
  if (semitoneDiff <= 0.5) {
    return 1 - (semitoneDiff / 0.5) * 0.2; // 80-100%
  } else if (semitoneDiff <= 1) {
    return 0.8 - (semitoneDiff - 0.5) * 0.6; // 20-80%
  } else if (semitoneDiff <= 2) {
    return 0.2 - (semitoneDiff - 1) * 0.2; // 0-20%
  }
  
  return 0;
}

/**
 * Calculate direction: is singer flat, sharp, or on pitch?
 * Returns: -1 (flat), 0 (on pitch), 1 (sharp)
 */
export function getPitchDirection(singerFreq: number, referenceFreq: number): number {
  if (!singerFreq || !referenceFreq) return 0;
  
  const semitoneDiff = octaveFoldedSemitoneDiff(singerFreq, referenceFreq);

  if (Math.abs(semitoneDiff) < 0.3) return 0; // On pitch (within ~30 cents)
  return semitoneDiff > 0 ? 1 : -1;
}

/**
 * Get score label based on percentage
 */
export function getScoreLabel(percentage: number): { label: string; emoji: string; stars: number } {
  if (percentage >= 90) {
    return { label: "Perfect Pitch!", emoji: "🎯", stars: 5 };
  } else if (percentage >= 75) {
    return { label: "Superstar!", emoji: "🌟", stars: 4 };
  } else if (percentage >= 60) {
    return { label: "Great Job!", emoji: "🎤", stars: 3 };
  } else if (percentage >= 45) {
    return { label: "Not Bad!", emoji: "👍", stars: 2 };
  } else if (percentage >= 30) {
    return { label: "Keep Practicing!", emoji: "💪", stars: 1 };
  } else {
    return { label: "Nice Try!", emoji: "🎵", stars: 1 };
  }
}
