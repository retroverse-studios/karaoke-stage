/**
 * PitchMeter Component
 * 
 * Visual indicator showing how in-tune the singer is.
 * Shows a slider with the singer's pitch relative to the reference.
 */

import React from 'react';

interface PitchMeterProps {
  /** How well pitches match (0-1) */
  matchScore: number;
  /** Direction: -1 (flat), 0 (on pitch), 1 (sharp) */
  direction: number;
  /** Current streak of good notes */
  streak: number;
  /** Is microphone actively listening */
  isListening: boolean;
  /** Whether to show the meter (toggle) */
  isVisible: boolean;
  /** Dark mode */
  isDark?: boolean;
}

const PitchMeter: React.FC<PitchMeterProps> = ({
  matchScore,
  direction,
  streak,
  isListening,
  isVisible,
  isDark = true,
}) => {
  if (!isVisible) return null;

  // Calculate position on the meter (-1 to 1 maps to 0% to 100%)
  // When on pitch (direction=0), show in center
  // When flat (direction=-1), show on left
  // When sharp (direction=1), show on right
  const position = 50 + (direction * (1 - matchScore) * 40);
  
  // Color based on match score
  const getColor = () => {
    if (!isListening) return isDark ? 'bg-gray-600' : 'bg-gray-400';
    if (matchScore >= 0.8) return 'bg-green-500';
    if (matchScore >= 0.6) return 'bg-yellow-500';
    if (matchScore >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Status text
  const getStatusText = () => {
    if (!isListening) return 'Mic off';
    if (matchScore >= 0.8) return 'Perfect!';
    if (matchScore >= 0.6) return 'Good!';
    if (direction === -1) return 'Flat';
    if (direction === 1) return 'Sharp';
    return 'Sing!';
  };

  // Glow effect when doing well
  const glowClass = matchScore >= 0.7 && isListening
    ? 'shadow-lg shadow-green-500/50'
    : '';

  return (
    <div className={`w-full max-w-md mx-auto ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Streak indicator */}
      {streak >= 5 && isListening && (
        <div className="text-center mb-1 animate-pulse">
          <span className="text-yellow-400 font-bold text-sm">
            {streak} note streak! 🔥
          </span>
        </div>
      )}
      
      {/* Main meter container */}
      <div className={`relative rounded-full p-1 ${
        isDark ? 'bg-white/10' : 'bg-gray-200'
      } ${glowClass}`}>
        {/* Track */}
        <div className={`relative h-8 rounded-full overflow-hidden ${
          isDark ? 'bg-black/40' : 'bg-gray-300'
        }`}>
          {/* Center marker (target) */}
          <div className={`absolute top-0 bottom-0 left-1/2 w-1 -ml-0.5 ${
            isDark ? 'bg-white/30' : 'bg-gray-400'
          }`} />
          
          {/* Flat/Sharp labels */}
          <div className={`absolute top-1/2 left-3 -translate-y-1/2 text-xs ${
            isDark ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Flat
          </div>
          <div className={`absolute top-1/2 right-3 -translate-y-1/2 text-xs ${
            isDark ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Sharp
          </div>
          
          {/* Pitch indicator (the moving dot) */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full transition-all duration-100 ${getColor()} ${
              isListening ? 'scale-100' : 'scale-75 opacity-50'
            }`}
            style={{ left: `calc(${position}% - 12px)` }}
          >
            {/* Inner glow when perfect */}
            {matchScore >= 0.8 && isListening && (
              <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
            )}
          </div>
        </div>
      </div>
      
      {/* Status text */}
      <div className="text-center mt-2">
        <span className={`text-sm font-medium ${
          matchScore >= 0.7 && isListening
            ? 'text-green-400'
            : isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

export default PitchMeter;
