
import React, { useState } from 'react';
import { ThemeConfig, ThemeId } from '../types';
import { SongMetadata } from '../services';

interface SongCardProps {
  song: SongMetadata;
  onSelect: (song: SongMetadata) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onChangeCategories: (id: string, themeIds: ThemeId[]) => void;
  theme: ThemeConfig;
  allThemes: Record<string, ThemeConfig>;
  isDark: boolean;
}

const SongCard: React.FC<SongCardProps> = ({ song, onSelect, onDelete, onRename, onChangeCategories, theme, allThemes, isDark }) => {
  // Get all themes except 'classic' for category picking
  const selectableThemes = (Object.values(allThemes) as ThemeConfig[]).filter(t => t.id !== 'classic');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(song.title);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Get array of theme IDs
  const songThemeIds = song.themeIds || ['christmas'];

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    if (window.confirm(`Delete "${song.title}"?`)) {
      onDelete(song.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTitle(song.title);
    setIsEditing(true);
  };

  const handleSaveTitle = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(song.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTitle(song.title);
    setIsEditing(false);
  };

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCategoryPicker(!showCategoryPicker);
  };

  const handleCategoryToggle = (e: React.MouseEvent, themeId: ThemeId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isSelected = songThemeIds.includes(themeId);
    let newThemeIds: ThemeId[];
    
    if (isSelected) {
      // Don't allow removing the last category
      if (songThemeIds.length <= 1) return;
      newThemeIds = songThemeIds.filter(id => id !== themeId);
    } else {
      newThemeIds = [...songThemeIds, themeId];
    }
    
    onChangeCategories(song.id, newThemeIds);
  };

  const handleCardClick = () => {
    if (!isEditing) {
      if (showCategoryPicker) {
        setShowCategoryPicker(false);
      } else {
        onSelect(song);
      }
    }
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Perform ${song.title}`}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`backdrop-blur-xl rounded-[2rem] p-6 border transition-all cursor-pointer group relative shadow-xl ${showCategoryPicker ? 'overflow-visible z-50' : 'overflow-hidden'} ${
        isDark 
          ? 'bg-white/5 border-white/10 hover:bg-white/10' 
          : 'bg-white/80 border-gray-200 hover:bg-white'
      }`}
    >
      {/* Glow Effect */}
      <div 
        className="absolute -inset-1 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl pointer-events-none"
        style={{ background: `linear-gradient(to right, ${theme.primaryHex}, ${theme.accentHex})` }}
      ></div>

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 flex gap-1.5 z-[999]">
        <button 
          type="button"
          onClick={handleCategoryClick}
          className="w-9 h-9 bg-purple-600/90 hover:bg-purple-500 text-white rounded-xl transition-all flex items-center justify-center shadow-lg active:scale-90 pointer-events-auto"
          aria-label="Change categories"
          title="Change categories"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </button>
        <button 
          type="button"
          onClick={handleEditClick}
          className="w-9 h-9 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center justify-center shadow-lg active:scale-90 pointer-events-auto"
          aria-label="Edit title"
          title="Edit title"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button 
          type="button"
          onClick={handleDelete}
          className="w-9 h-9 bg-red-600/90 hover:bg-red-500 text-white rounded-xl transition-all flex items-center justify-center shadow-lg active:scale-90 pointer-events-auto"
          aria-label="Delete track"
          title="Delete track"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Category Badges - show all categories */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {songThemeIds.map(themeId => {
          const t = allThemes[themeId];
          if (!t) return null;
          return (
            <div 
              key={themeId}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${t.primaryHex}33` }}
              title={t.name}
            >
              {t.emoji}
            </div>
          );
        })}
      </div>
      
      {/* Category Picker Dropdown - checkbox list */}
      {showCategoryPicker && (
        <div 
          className={`absolute top-16 right-4 border rounded-xl p-3 shadow-2xl z-[1000] min-w-[180px] ${
            isDark ? 'bg-slate-800 border-white/20' : 'bg-white border-gray-200'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <p className={`text-[9px] uppercase tracking-wider px-1 pb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Select Categories</p>
          <div className="space-y-1">
            {selectableThemes.map(t => {
              const isChecked = songThemeIds.includes(t.id as ThemeId);
              const isLastChecked = isChecked && songThemeIds.length === 1;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={(e) => handleCategoryToggle(e, t.id as ThemeId)}
                  disabled={isLastChecked}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left text-sm transition-all ${
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  } ${isLastChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isChecked ? 'bg-purple-600 border-purple-600' : isDark ? 'border-gray-500' : 'border-gray-300'
                  }`}>
                    {isChecked && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-lg">{t.emoji}</span>
                  <span className={`${isChecked ? 'font-semibold' : ''} ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.name}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowCategoryPicker(false); }}
            className={`w-full mt-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Done
          </button>
        </div>
      )}
      
      <div className="relative z-10">
        {isEditing ? (
          <form onSubmit={handleSaveTitle} onClick={e => e.stopPropagation()} className="mb-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-lg font-bold outline-none focus:ring-2 ${
                isDark 
                  ? 'bg-black/60 border-white/20 text-white focus:ring-white/30' 
                  : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-gray-400'
              }`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleCancelEdit(e);
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg transition-all ${
                  isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <h3 className={`text-xl font-bold mb-1 transition-colors line-clamp-1 ${
              isDark ? 'group-hover:text-white' : 'text-gray-900 group-hover:text-gray-700'
            }`}>
              {song.title}
            </h3>
            <p className={`text-[10px] font-mono uppercase tracking-widest mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              MP3+{(song.lyricsFormat || 'cdg').toUpperCase()} Pair
            </p>
          </>
        )}
      </div>
      
      {!isEditing && (
        <div 
          className={`w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
            isDark ? 'bg-white/5 group-hover:text-white' : 'bg-gray-100 group-hover:text-gray-900'
          }`}
          style={{ color: theme.primaryHex }}
        >
          Perform Track
        </div>
      )}
    </div>
  );
};

export default SongCard;
