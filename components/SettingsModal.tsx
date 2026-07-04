
import React, { useState, useEffect } from 'react';
import { UserSettings, CategoryDisplayMode, CustomCategory, ParticleType, ThemeConfig } from '../types';
import { THEMES } from '../constants';

interface SettingsModalProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onClose: () => void;
  allThemes: Record<string, ThemeConfig>;
}

const EMOJI_OPTIONS = ['🎵', '🎶', '🎤', '🎸', '🎹', '🎺', '🥁', '🎻', '💿', '📀', '🎧', '🔊', '⭐', '💫', '✨', '🌟', '❤️', '💕', '💖', '🔥', '🌈', '🎀', '🎁', '🎊', '🎉', '👨', '👩', '👴', '👵', '👶', '🧒', '👦', '👧', '🍺', '🍷', '🥂', '🍾', '☀️', '🌙', '⚡', '💎'];

const PARTICLE_OPTIONS: { type: ParticleType; label: string; preview: string }[] = [
  { type: 'star', label: 'Stars', preview: '⭐✨' },
  { type: 'snow', label: 'Snow', preview: '❄️' },
  { type: 'confetti', label: 'Confetti', preview: '🎊🎉' },
  { type: 'heart', label: 'Hearts', preview: '💕💖' },
  { type: 'sparkle', label: 'Sparkles', preview: '✨💫' },
  { type: 'bubble', label: 'Bubbles', preview: '🫧' },
  { type: 'bat', label: 'Spooky', preview: '🦇🎃' },
  { type: 'egg', label: 'Spring', preview: '🥚🌸' },
];

const COLOR_OPTIONS = [
  '#dc2626', // red
  '#ea580c', // orange
  '#d97706', // amber
  '#ca8a04', // yellow
  '#65a30d', // lime
  '#16a34a', // green
  '#0d9488', // teal
  '#0891b2', // cyan
  '#0284c7', // sky
  '#2563eb', // blue
  '#4f46e5', // indigo
  '#7c3aed', // violet
  '#9333ea', // purple
  '#c026d3', // fuchsia
  '#db2777', // pink
  '#e11d48', // rose
];

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdateSettings, onClose, allThemes }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'custom'>('general');
  const [newCategory, setNewCategory] = useState<CustomCategory>({
    id: '',
    name: '',
    emoji: '🎵',
    primaryHex: '#2563eb',
    particleType: 'star'
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDarkModeToggle = () => {
    onUpdateSettings({ ...settings, darkMode: !settings.darkMode });
  };

  const handleDisplayModeChange = (mode: CategoryDisplayMode) => {
    onUpdateSettings({ ...settings, categoryDisplay: mode });
  };

  const handleCategoryVisibilityToggle = (categoryId: string) => {
    const hidden = settings.hiddenCategories || [];
    if (hidden.includes(categoryId)) {
      onUpdateSettings({ ...settings, hiddenCategories: hidden.filter(id => id !== categoryId) });
    } else {
      onUpdateSettings({ ...settings, hiddenCategories: [...hidden, categoryId] });
    }
  };

  const handleCreateCategory = () => {
    if (!newCategory.name.trim()) return;
    
    const id = `custom-${Date.now()}`;
    const category: CustomCategory = {
      ...newCategory,
      id,
      name: newCategory.name.trim()
    };
    
    const customCategories = settings.customCategories || [];
    onUpdateSettings({ 
      ...settings, 
      customCategories: [...customCategories, category] 
    });
    
    // Reset form
    setNewCategory({
      id: '',
      name: '',
      emoji: '🎵',
      primaryHex: '#2563eb',
      particleType: 'star'
    });
  };

  const handleDeleteCustomCategory = (id: string) => {
    if (!confirm('Delete this custom category? Songs will keep their other categories.')) return;
    
    const customCategories = settings.customCategories || [];
    onUpdateSettings({
      ...settings,
      customCategories: customCategories.filter(c => c.id !== id)
    });
  };

  const handleUpdateCustomCategory = (updated: CustomCategory) => {
    const customCategories = settings.customCategories || [];
    onUpdateSettings({
      ...settings,
      customCategories: customCategories.map(c => c.id === updated.id ? updated : c)
    });
    setEditingCategory(null);
  };

  const builtInThemes = Object.values(THEMES).filter(t => t.id !== 'classic');
  const customCategories = settings.customCategories || [];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={`${settings.darkMode ? 'bg-slate-900' : 'bg-white'} border ${settings.darkMode ? 'border-white/10' : 'border-gray-200'} rounded-[2rem] p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative`}>
        <button
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-5 right-5 text-2xl ${settings.darkMode ? 'opacity-50 hover:opacity-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          ×
        </button>
        
        <h2 className={`text-2xl font-bold mb-6 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
          Settings
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['general', 'categories', 'custom'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : settings.darkMode 
                    ? 'bg-white/10 text-gray-400 hover:bg-white/20' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'general' && 'General'}
              {tab === 'categories' && 'Show/Hide'}
              {tab === 'custom' && 'Custom Categories'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Dark Mode Toggle */}
              <div className={`p-4 rounded-xl ${settings.darkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Dark Mode
                    </h3>
                    <p className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Toggle between dark and light theme
                    </p>
                  </div>
                  <button
                    onClick={handleDarkModeToggle}
                    className={`w-14 h-8 rounded-full transition-all relative ${
                      settings.darkMode ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
                      settings.darkMode ? 'left-7' : 'left-1'
                    }`}>
                      <span className="flex items-center justify-center h-full text-sm">
                        {settings.darkMode ? '🌙' : '☀️'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category Display Mode */}
              <div className={`p-4 rounded-xl ${settings.darkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-3 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Category Display
                </h3>
                <div className="flex gap-2">
                  {(['emoji', 'both', 'name'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => handleDisplayModeChange(mode)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        settings.categoryDisplay === mode
                          ? 'bg-purple-600 text-white'
                          : settings.darkMode
                            ? 'bg-white/10 text-gray-400 hover:bg-white/20'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {mode === 'emoji' && '😀 Emoji'}
                      {mode === 'both' && '😀 Both'}
                      {mode === 'name' && 'Aa Name'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-3">
              <p className={`text-sm mb-4 ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Choose which categories appear in the navigation bar. "All Songs" is always visible.
              </p>
              
              {/* Built-in categories */}
              <div className={`text-xs uppercase tracking-wider mb-2 ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Built-in Categories
              </div>
              {builtInThemes.map(theme => {
                const isHidden = (settings.hiddenCategories || []).includes(theme.id);
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleCategoryVisibilityToggle(theme.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      settings.darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      !isHidden ? 'bg-purple-600 border-purple-600' : settings.darkMode ? 'border-gray-600' : 'border-gray-300'
                    }`}>
                      {!isHidden && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xl">{theme.emoji}</span>
                    <span className={`flex-1 text-left font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {theme.name}
                    </span>
                    <span className={`text-xs ${isHidden ? 'text-red-400' : 'text-green-400'}`}>
                      {isHidden ? 'Hidden' : 'Visible'}
                    </span>
                  </button>
                );
              })}

              {/* Custom categories */}
              {customCategories.length > 0 && (
                <>
                  <div className={`text-xs uppercase tracking-wider mt-6 mb-2 ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Custom Categories
                  </div>
                  {customCategories.map(cat => {
                    const isHidden = (settings.hiddenCategories || []).includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryVisibilityToggle(cat.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          settings.darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          !isHidden ? 'bg-purple-600 border-purple-600' : settings.darkMode ? 'border-gray-600' : 'border-gray-300'
                        }`}>
                          {!isHidden && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xl">{cat.emoji}</span>
                        <span className={`flex-1 text-left font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {cat.name}
                        </span>
                        <span className={`text-xs ${isHidden ? 'text-red-400' : 'text-green-400'}`}>
                          {isHidden ? 'Hidden' : 'Visible'}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Custom Categories Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-6">
              {/* Create New Category */}
              <div className={`p-4 rounded-xl ${settings.darkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-4 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Create New Category
                </h3>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className={`text-xs uppercase tracking-wider ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="e.g., Dad's Favorites, Wedding, 21st Party"
                      className={`w-full mt-1 px-4 py-2 rounded-lg outline-none ${
                        settings.darkMode 
                          ? 'bg-black/40 border border-white/10 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Emoji */}
                  <div>
                    <label className={`text-xs uppercase tracking-wider ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Icon
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setNewCategory({ ...newCategory, emoji })}
                          className={`w-9 h-9 rounded-lg text-lg transition-all ${
                            newCategory.emoji === emoji
                              ? 'bg-purple-600 ring-2 ring-purple-400'
                              : settings.darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className={`text-xs uppercase tracking-wider ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Color
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewCategory({ ...newCategory, primaryHex: color })}
                          className={`w-8 h-8 rounded-lg transition-all ${
                            newCategory.primaryHex === color ? 'ring-2 ring-white scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Particle Type */}
                  <div>
                    <label className={`text-xs uppercase tracking-wider ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Falling Particles
                    </label>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {PARTICLE_OPTIONS.map(opt => (
                        <button
                          key={opt.type}
                          onClick={() => setNewCategory({ ...newCategory, particleType: opt.type })}
                          className={`p-2 rounded-lg text-center transition-all ${
                            newCategory.particleType === opt.type
                              ? 'bg-purple-600 text-white'
                              : settings.darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <div className="text-lg">{opt.preview}</div>
                          <div className="text-xs mt-1">{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview & Create */}
                  <div className="flex items-center gap-4 pt-2">
                    <div 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{ backgroundColor: `${newCategory.primaryHex}40` }}
                    >
                      <span className="text-xl">{newCategory.emoji}</span>
                      <span className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {newCategory.name || 'Preview'}
                      </span>
                    </div>
                    <button
                      onClick={handleCreateCategory}
                      disabled={!newCategory.name.trim()}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold rounded-xl transition-all"
                    >
                      Create Category
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Custom Categories */}
              {customCategories.length > 0 && (
                <div>
                  <h3 className={`font-semibold mb-3 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Your Custom Categories
                  </h3>
                  <div className="space-y-2">
                    {customCategories.map(cat => (
                      <div
                        key={cat.id}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          settings.darkMode ? 'bg-white/5' : 'bg-gray-50'
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${cat.primaryHex}40` }}
                        >
                          {cat.emoji}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {cat.name}
                          </div>
                          <div className={`text-xs ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {PARTICLE_OPTIONS.find(p => p.type === cat.particleType)?.label || 'Stars'} particles
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCustomCategory(cat.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
