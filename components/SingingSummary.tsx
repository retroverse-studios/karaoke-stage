/**
 * SingingSummary Component
 * 
 * End-of-song score screen showing how well the user sang.
 */

import React from 'react';
import { getScoreLabel } from '../utils/pitchDetection';

interface SingingSummaryProps {
  /** Percentage score (0-100) */
  percentage: number;
  /** Best streak achieved */
  bestStreak: number;
  /** Total samples analyzed */
  totalSamples: number;
  /** Callback to sing again */
  onSingAgain: () => void;
  /** Callback to go back to library */
  onBack: () => void;
  /** Theme primary color */
  primaryColor: string;
  /** Dark mode */
  isDark?: boolean;
}

const SingingSummary: React.FC<SingingSummaryProps> = ({
  percentage,
  bestStreak,
  totalSamples,
  onSingAgain,
  onBack,
  primaryColor,
  isDark = true,
}) => {
  const { label, emoji, stars } = getScoreLabel(percentage);
  
  // Only show summary if we have enough data
  const hasData = totalSamples > 10;

  // Render stars
  const renderStars = () => {
    const fullStars = Math.floor(stars);
    const hasHalfStar = stars % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex justify-center gap-1 text-3xl">
        {Array(fullStars).fill(null).map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400">★</span>}
        {Array(emptyStars).fill(null).map((_, i) => (
          <span key={`empty-${i}`} className={isDark ? 'text-gray-600' : 'text-gray-300'}>★</span>
        ))}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${
      isDark ? 'bg-black/90' : 'bg-white/90'
    } backdrop-blur-md`}>
      <div className={`rounded-3xl p-8 max-w-md w-full text-center ${
        isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200 shadow-xl'
      }`}>
        {/* Emoji */}
        <div className="text-6xl mb-4">{emoji}</div>
        
        {/* Title */}
        <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {hasData ? label : 'Song Complete!'}
        </h2>
        
        {hasData ? (
          <>
            {/* Percentage */}
            <div className="mb-4">
              <span 
                className="text-6xl font-bold"
                style={{ color: primaryColor }}
              >
                {percentage}%
              </span>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                in tune
              </p>
            </div>
            
            {/* Stars */}
            <div className="mb-6">
              {renderStars()}
            </div>
            
            {/* Stats */}
            <div className={`flex justify-center gap-8 mb-8 text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {bestStreak > 0 && (
                <div>
                  <span className="text-2xl font-bold text-yellow-400">{bestStreak}</span>
                  <p>Best Streak 🔥</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Enable the microphone to get your singing score!
          </p>
        )}
        
        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              isDark 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            Back to Library
          </button>
          <button
            onClick={onSingAgain}
            className="flex-1 py-3 rounded-xl font-bold transition-all text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Sing Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingingSummary;
