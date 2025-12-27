/**
 * Karaoke Stage - Main Application
 * 
 * A web-based karaoke player with themed categories and CDG+MP3 support.
 */

import React, { useState, useMemo } from 'react';
import Atmosphere from './components/Atmosphere';
import SongCard from './components/SongCard';
import KaraokeStage from './components/KaraokeStage';
import SettingsModal from './components/SettingsModal';
import UploadModal from './components/UploadModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeId, ThemeConfig } from './types';
import { SongMetadata } from './services';
import { useSettings } from './hooks/useSettings';
import { useSongLibrary } from './hooks/useSongLibrary';
import { storage } from './services';

const App: React.FC = () => {
  // Use extracted hooks
  const {
    settings,
    setSettings,
    allThemes,
    activeTheme,
    visibleThemes,
    isDark,
    changeTheme
  } = useSettings();

  const {
    songs,
    isLoading,
    currentSong,
    selectSong,
    clearCurrentSong,
    deleteSong,
    renameSong,
    changeSongCategories
  } = useSongLibrary();

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Filter songs by search and theme
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase());
      const songThemeIds = song.themeIds || [];
      const matchesTheme = settings.themeId === 'classic' || songThemeIds.includes(settings.themeId);
      return matchesSearch && matchesTheme;
    });
  }, [searchTerm, songs, settings.themeId]);

  // Handler for bulk import (used by UploadModal)
  const handleBulkImport = async (
    name: string, 
    mp3File: File, 
    cdgFile: File, 
    categories: ThemeId[]
  ): Promise<boolean> => {
    try {
      const buffer = await cdgFile.arrayBuffer();
      const lyricsData = new Uint8Array(buffer);
      
      const themeIds = categories.length > 0 
        ? categories 
        : [settings.themeId === 'classic' ? 'christmas' : settings.themeId];

      await storage.saveSong({
        title: name,
        duration: 0,
        difficulty: 'Medium',
        description: 'Custom Track',
        audioBlob: mp3File,
        lyricsFormat: 'cdg',
        lyricsData,
        isCustom: true,
        themeIds
      });

      // Reload page to refresh song list
      // TODO: Add a refresh method to useSongLibrary for better UX
      window.location.reload();
      return true;
    } catch (err) {
      console.error("Failed to save song", err);
      return false;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-holiday ${
        isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <div className={`w-12 h-12 border-4 rounded-full animate-spin mb-4 ${
          isDark ? 'border-white/20 border-t-white' : 'border-gray-300 border-t-gray-600'
        }`}></div>
        <p>Opening the Music Library...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative flex flex-col overflow-x-hidden ${
      isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      <Atmosphere type={activeTheme.particleType} />
      <div className={`fixed inset-0 bg-gradient-to-b ${
        isDark ? activeTheme.bgGradient : 'from-gray-100 via-gray-50 to-gray-100'
      } pointer-events-none`}></div>

      <header className="relative z-10 px-6 py-12 text-center">
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className={`absolute top-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-50 ${
            isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <h1 
          className={`text-6xl md:text-7xl ${activeTheme.font} font-bold mb-2`} 
          style={{ color: activeTheme.primaryHex }}
        >
          {activeTheme.terminology.brand}
        </h1>
        <p className={`text-xl uppercase tracking-widest ${isDark ? 'opacity-60' : 'opacity-50'}`}>
          {activeTheme.terminology.tagline}
        </p>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 flex-1 pb-20">
        {!currentSong && (
          <ErrorBoundary
            title="Library Error"
            actionText="Reload"
            onAction={() => window.location.reload()}
            isDark={isDark}
          >
          <div className="space-y-10">
            {/* Theme selector and search */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap justify-center items-center gap-2">
                {visibleThemes.map((t: ThemeConfig) => {
                  const displayMode = settings.categoryDisplay || 'emoji';
                  return (
                    <button
                      key={t.id}
                      onClick={() => changeTheme(t.id as ThemeId)}
                      title={t.name}
                      className={`px-3 py-2 rounded-full border transition-all text-sm font-bold ${
                        settings.themeId === t.id 
                          ? isDark ? 'border-white bg-white/20' : 'border-gray-800 bg-gray-800 text-white'
                          : isDark ? 'border-white/10 bg-black/40 text-gray-400 hover:border-white/30' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {displayMode !== 'name' && <span>{t.emoji}</span>}
                      {displayMode !== 'emoji' && <span className={displayMode === 'both' ? 'ml-1' : ''}>{t.name}</span>}
                    </button>
                  );
                })}
              </div>

              <div className={`backdrop-blur-xl rounded-3xl p-4 border flex flex-col md:flex-row gap-4 items-center ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-gray-200'
              }`}>
                <input 
                  type="text"
                  placeholder="Find a track..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className={`flex-1 rounded-2xl px-6 py-4 outline-none focus:ring-2 ${
                    isDark 
                      ? 'bg-black/40 border border-white/10 focus:ring-white/20 text-white placeholder-gray-500' 
                      : 'bg-gray-100 border border-gray-200 focus:ring-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <button 
                  onClick={() => setIsUploading(true)}
                  className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 text-white"
                  style={{ backgroundColor: activeTheme.primaryHex }}
                >
                  Add Song
                </button>
              </div>
            </div>

            {/* Song grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSongs.map((song: SongMetadata) => {
                const songThemeIds = song.themeIds || ['christmas'];
                const primaryTheme = allThemes[songThemeIds[0]] || activeTheme;
                return (
                  <SongCard 
                    key={song.id} 
                    song={song} 
                    onSelect={selectSong} 
                    onDelete={deleteSong}
                    onRename={renameSong}
                    onChangeCategories={changeSongCategories}
                    theme={primaryTheme}
                    allThemes={allThemes}
                    isDark={isDark}
                  />
                );
              })}
            </div>

            {/* Empty state */}
            {filteredSongs.length === 0 && (
              <div className={`text-center py-20 ${isDark ? 'opacity-40' : 'opacity-50'}`}>
                <p className="text-4xl mb-4">📭</p>
                <p>No songs found in this category.</p>
              </div>
            )}
          </div>
          </ErrorBoundary>
        )}

        {/* Karaoke player - wrapped in error boundary to catch playback errors */}
        {currentSong && (
          <ErrorBoundary
            title="Playback Error"
            actionText="Back to Library"
            onAction={clearCurrentSong}
            isDark={isDark}
          >
            <KaraokeStage 
              song={currentSong} 
              settings={settings} 
              onExit={clearCurrentSong} 
              theme={activeTheme} 
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploading}
        onClose={() => setIsUploading(false)}
        onSongAdded={() => {}}
        onBulkImport={handleBulkImport}
        allThemes={allThemes}
        activeTheme={activeTheme}
        currentThemeId={settings.themeId}
        isDark={isDark}
      />

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setShowSettings(false)}
          allThemes={allThemes}
        />
      )}
    </div>
  );
};

export default App;
