
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Atmosphere from './components/Atmosphere';
import SongCard from './components/SongCard';
import KaraokeStage from './components/KaraokeStage';
import SettingsModal from './components/SettingsModal';
import { Song, UserSettings, ThemeId, CategoryDisplayMode, ThemeConfig, CustomCategory } from './types';
import { THEMES } from './constants';
import { pickAndScanFolder, importSongPairs, isFolderPickerSupported, ImportProgress, ImportResult, SongPair } from './utils/folderImport';

// --- Improved Singleton IndexedDB Utility ---
const DB_NAME = 'MerryMelodiesDB_v1';
const STORE_NAME = 'songs';
let dbInstance: IDBDatabase | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
};

const App: React.FC = () => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customSongs, setCustomSongs] = useState<Song[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [stagedFiles, setStagedFiles] = useState<{ audio?: File, cdg?: File }>({});
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategories, setUploadCategories] = useState<ThemeId[]>([]);
  
  const audioFileRef = useRef<HTMLInputElement>(null);
  const cdgFileRef = useRef<HTMLInputElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  
  // Folder import state
  const [folderImportProgress, setFolderImportProgress] = useState<ImportProgress | null>(null);
  const [folderImportResult, setFolderImportResult] = useState<ImportResult | null>(null);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaults: UserSettings = {
      themeId: 'christmas',
      backingVolume: 80,
      darkMode: true,
      categoryDisplay: 'emoji',
      hiddenCategories: [],
      customCategories: []
    };
    try {
      const saved = localStorage.getItem('mm_settings_v7');
      if (saved) {
        const parsed = JSON.parse(saved);

        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.error('[Settings] Failed to parse:', e);
    }
    return defaults;
  });

  // Build allThemes including custom categories
  const allThemes = useMemo((): Record<string, ThemeConfig> => {
    const themes: Record<string, ThemeConfig> = { ...THEMES };
    
    (settings.customCategories || []).forEach(cat => {
      themes[cat.id] = {
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        primary: 'slate-500',
        primaryHex: cat.primaryHex,
        accent: 'slate-400',
        accentHex: '#94a3b8',
        bgGradient: 'from-slate-950 via-slate-900/20 to-slate-950',
        particleType: cat.particleType,
        font: 'font-sans',
        isCustom: true,
        terminology: {
          brand: cat.name,
          tagline: 'Custom Playlist',
          uploadTitle: 'Add Songs',
          uploadSubtitle: 'Build your playlist',
          emptyTitle: 'No Songs Yet',
          emptySubtitle: 'Add some songs to this category!',
          buttonText: 'Add Songs'
        }
      };
    });
    
    return themes;
  }, [settings.customCategories]);

  const activeTheme = allThemes[settings.themeId] || THEMES.classic;

  // Load Library once on mount
  // Load Library once on mount - only metadata, no large binary data
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const db = await getDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          // Only extract metadata - exclude audioBlob and lyricsData from React state
          const songs: Song[] = request.result.map((s: any) => ({
            id: s.id,
            title: s.title,
            duration: s.duration || 0,
            difficulty: s.difficulty || 'Medium',
            description: s.description || 'Custom Track',
            isCustom: s.isCustom ?? true,
            themeIds: s.themeIds || (s.themeId ? [s.themeId] : ['christmas']),
            lyricsFormat: s.lyricsFormat || 'cdg',
          }));
          setCustomSongs(songs);
          setIsLoading(false);
        };
      } catch (err) {
        console.error("Failed to load library", err);
        setIsLoading(false);
      }
    };
    loadLibrary();
  }, []);

  useEffect(() => {
    localStorage.setItem('mm_settings_v7', JSON.stringify(settings));
  }, [settings]);

  // Get visible themes (excluding hidden ones, but always show 'classic')
  const visibleThemes = useMemo(() => {
    const hidden = settings.hiddenCategories || [];
    return Object.values(allThemes).filter(t => 
      t.id === 'classic' || !hidden.includes(t.id)
    );
  }, [allThemes, settings.hiddenCategories]);

  // Load full song data from IndexedDB when selecting a song to play
  const loadSongForPlayback = async (songId: string): Promise<Song | null> => {
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve) => {
        const request = store.get(songId);
        request.onsuccess = () => {
          const s = request.result;
          if (!s) {
            resolve(null);
            return;
          }
          resolve({
            id: s.id,
            title: s.title,
            duration: s.duration || 0,
            difficulty: s.difficulty || 'Medium',
            description: s.description || 'Custom Track',
            isCustom: s.isCustom ?? true,
            themeIds: s.themeIds || (s.themeId ? [s.themeId] : ['christmas']),
            audioUrl: s.audioBlob ? URL.createObjectURL(s.audioBlob) : undefined,
            lyricsFormat: s.lyricsFormat || 'cdg',
            lyricsData: s.lyricsData || s.cdgData,  // Support legacy cdgData field
            cdgData: s.cdgData,  // Keep for backwards compatibility
          });
        };
        request.onerror = () => resolve(null);
      });
    } catch (err) {
      console.error("Failed to load song for playback", err);
      return null;
    }
  };

  const handleSelectSong = async (song: Song) => {
    const fullSong = await loadSongForPlayback(song.id);
    if (fullSong) {
      setCurrentSong(fullSong);
    } else {
      alert("Failed to load song data");
    }
  };

  const handleFileChange = (type: 'audio' | 'cdg') => {
    const file = type === 'audio' ? audioFileRef.current?.files?.[0] : cdgFileRef.current?.files?.[0];
    if (file) {
      setStagedFiles(prev => ({ ...prev, [type]: file }));
      // Auto-fill title from audio filename if not already set
      if (type === 'audio' && !uploadTitle) {
        const autoTitle = file.name.replace(/\.[^/.]+$/, "").replace(/ - \d+$/, "");
        setUploadTitle(autoTitle);
      }
    }
  };

  const handleFileUpload = async () => {
    const { audio, cdg } = stagedFiles;
    if (!audio || !cdg) {
      alert("Missing files!");
      return;
    }

    setIsProcessing(true);
    try {
      const buffer = await cdg.arrayBuffer();
      const cdgData = new Uint8Array(buffer);
      const db = await getDB();

      const songId = `song-${Date.now()}`;
      const title = uploadTitle.trim() || audio.name.replace(/\.[^/.]+$/, "").replace(/ - \d+$/, "");
      const themeIds = uploadCategories.length > 0 ? uploadCategories : [settings.themeId === 'classic' ? 'christmas' : settings.themeId];

      // Data to persist in IndexedDB (includes binary data)
      const persistentData = {
        id: songId,
        title,
        duration: 0,
        difficulty: 'Medium',
        description: 'Custom Track',
        audioBlob: audio,
        lyricsFormat: 'cdg',
        lyricsData: cdgData,
        cdgData,  // Keep for backwards compatibility
        isCustom: true,
        themeIds
      };

      // Metadata only for React state (no large binary data)
      const metadataSong: Song = {
        id: songId,
        title,
        duration: 0,
        difficulty: 'Medium',
        description: 'Custom Track',
        isCustom: true,
        themeIds,
        lyricsFormat: 'cdg'
      };

      // Full song for immediate playback (loaded fresh, not kept in state)
      const playbackSong: Song = {
        ...metadataSong,
        audioUrl: URL.createObjectURL(audio),
        lyricsData: cdgData,
        cdgData,  // Keep for backwards compatibility
      };

      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(persistentData);

      transaction.oncomplete = () => {
        setCustomSongs(prev => [metadataSong, ...prev]);
        setStagedFiles({});
        setUploadTitle('');
        setUploadCategories([]);
        setIsUploading(false);
        setIsProcessing(false);
        setCurrentSong(playbackSong);
      };
    } catch (err) {
      alert("Error saving song.");
      setIsProcessing(false);
    }
  };

  const handleDeleteSong = async (id: string) => {
    console.log(`[App] Deleting ID: ${id}`);

    // 1. Instant UI Feedback (Optimistic)
    // We update the local state immediately so the user sees it disappear
    setCustomSongs(prev => {
      const updated = prev.filter(s => s.id !== id);
      console.log(`[App] UI Updated. Remaining: ${updated.length}`);
      return [...updated];
    });

    // 2. Database Cleanup
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);

      transaction.oncomplete = () => {
        console.log(`[App] Permanently removed from DB: ${id}`);
      };

      if (currentSong?.id === id) setCurrentSong(null);
    } catch (err) {
      console.error("[App] Failed to delete from disk", err);
    }
  };

  const handleRenameSong = async (id: string, newTitle: string) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    // Update UI immediately
    setCustomSongs(prev => prev.map(s => 
      s.id === id ? { ...s, title: trimmedTitle } : s
    ));

    // Persist to IndexedDB
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const song = request.result;
        if (song) {
          song.title = trimmedTitle;
          store.put(song);
        }
      };
    } catch (err) {
      console.error("[App] Failed to rename song", err);
    }
  };

  const handleChangeSongCategories = async (id: string, newThemeIds: ThemeId[]) => {
    // Update UI immediately
    setCustomSongs(prev => prev.map(s => 
      s.id === id ? { ...s, themeIds: newThemeIds } : s
    ));

    // Persist to IndexedDB
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const song = request.result;
        if (song) {
          song.themeIds = newThemeIds;
          // Clean up legacy field
          delete song.themeId;
          store.put(song);
        }
      };
    } catch (err) {
      console.error("[App] Failed to change song categories", err);
    }
  };

  // Save a single song to IndexedDB (used by folder import)
  const saveSongToDb = async (name: string, mp3File: File, cdgFile: File, categories: ThemeId[]): Promise<boolean> => {
    try {
      const buffer = await cdgFile.arrayBuffer();
      const lyricsData = new Uint8Array(buffer);
      const db = await getDB();

      const songId = `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // If no categories matched, default to current theme (or christmas if on 'classic')
      const themeIds = categories.length > 0 
        ? categories 
        : [settings.themeId === 'classic' ? 'christmas' : settings.themeId];

      const persistentData = {
        id: songId,
        title: name,
        duration: 0,
        difficulty: 'Medium',
        description: 'Custom Track',
        audioBlob: mp3File,
        lyricsFormat: 'cdg',
        lyricsData,
        cdgData: lyricsData,  // Keep for backwards compatibility
        isCustom: true,
        themeIds
      };

      const metadataSong: Song = {
        id: songId,
        title: name,
        duration: 0,
        difficulty: 'Medium',
        description: 'Custom Track',
        isCustom: true,
        themeIds,
        lyricsFormat: 'cdg'
      };

      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(persistentData);

        transaction.oncomplete = () => {
          setCustomSongs(prev => [metadataSong, ...prev]);
          resolve(true);
        };
        transaction.onerror = () => resolve(false);
      });
    } catch (err) {
      console.error("[App] Failed to save song", err);
      return false;
    }
  };

  // Handle folder import
  const handleFolderImport = async () => {
    if (!isFolderPickerSupported()) {
      alert('Folder import is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setFolderImportResult(null);
    
    try {
      // Step 1: Scan folder for mp3+cdg pairs
      const pairs = await pickAndScanFolder((progress) => {
        setFolderImportProgress(progress);
      });

      if (pairs.length === 0) {
        alert('No MP3+CDG pairs found in the selected folder.');
        setFolderImportProgress(null);
        return;
      }

      // Step 2: Import the pairs
      const result = await importSongPairs(pairs, saveSongToDb, (progress) => {
        setFolderImportProgress(progress);
      });

      setFolderImportResult(result);
      setFolderImportProgress(null);
    } catch (err: any) {
      // User cancelled folder picker
      if (err.name === 'AbortError') {
        setFolderImportProgress(null);
        return;
      }
      console.error("[App] Folder import failed", err);
      alert(`Folder import failed: ${err.message}`);
      setFolderImportProgress(null);
    }
  };

  const filteredSongs = useMemo(() => {
    return customSongs.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase());
      const songThemeIds = song.themeIds || (song.themeId ? [song.themeId] : []);
      const matchesTheme = settings.themeId === 'classic' || songThemeIds.includes(settings.themeId);
      return matchesSearch && matchesTheme;
    });
  }, [searchTerm, customSongs, settings.themeId]);

  const changeTheme = (id: ThemeId) => {
    setSettings(prev => ({ ...prev, themeId: id }));
  };

  const isDark = settings.darkMode;

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-holiday ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`w-12 h-12 border-4 rounded-full animate-spin mb-4 ${isDark ? 'border-white/20 border-t-white' : 'border-gray-300 border-t-gray-600'}`}></div>
        <p>Opening the Music Library...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative flex flex-col overflow-x-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Atmosphere type={activeTheme.particleType} />
      <div className={`fixed inset-0 bg-gradient-to-b ${isDark ? activeTheme.bgGradient : 'from-gray-100 via-gray-50 to-gray-100'} pointer-events-none`}></div>

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

        <h1 className={`text-6xl md:text-7xl ${activeTheme.font} font-bold mb-2`} style={{ color: activeTheme.primaryHex }}>
          {activeTheme.terminology.brand}
        </h1>
        <p className={`text-xl uppercase tracking-widest ${isDark ? 'opacity-60' : 'opacity-50'}`}>{activeTheme.terminology.tagline}</p>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 flex-1 pb-20">
        {!currentSong && (
          <div className="space-y-10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap justify-center items-center gap-2">
                {visibleThemes.map(t => {
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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

            {isUploading && (
              <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                <div className={`rounded-[2.5rem] p-8 max-w-lg w-full relative max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
                  <button onClick={() => { setIsUploading(false); setUploadTitle(''); setUploadCategories([]); setStagedFiles({}); setFolderImportProgress(null); setFolderImportResult(null); }} className={`absolute top-6 right-6 text-2xl ${isDark ? 'opacity-50 hover:opacity-100' : 'text-gray-400 hover:text-gray-600'}`}>×</button>
                  <h2 className={`text-3xl ${activeTheme.font} text-center mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Songs</h2>
                  
                  {/* Folder Import Section */}
                  <div className={`p-4 rounded-2xl border mb-6 ${isDark ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Import from Folder</h3>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Scan a folder for MP3+CDG pairs</p>
                      </div>
                    </div>
                    
                    {/* Progress indicator */}
                    {folderImportProgress && (
                      <div className="mb-3">
                        <div className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {folderImportProgress.phase === 'scanning' && `Scanning... Found ${folderImportProgress.found} songs`}
                          {folderImportProgress.phase === 'importing' && `Importing ${folderImportProgress.imported + 1} of ${folderImportProgress.total}...`}
                          {folderImportProgress.phase === 'done' && 'Done!'}
                        </div>
                        {folderImportProgress.currentFile && (
                          <div className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {folderImportProgress.currentFile}
                          </div>
                        )}
                        <div className={`h-2 rounded-full mt-2 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                          <div 
                            className="h-full bg-purple-600 transition-all duration-300"
                            style={{ 
                              width: folderImportProgress.total > 0 
                                ? `${(folderImportProgress.imported / folderImportProgress.total) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Import result summary */}
                    {folderImportResult && (
                      <div className={`p-3 rounded-xl mb-3 ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                        <div className={`font-semibold mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                          Import Complete!
                        </div>
                        <div className={`text-sm space-y-1 ${isDark ? 'text-green-300/80' : 'text-green-600'}`}>
                          <div>{folderImportResult.imported} songs imported</div>
                          <div>{folderImportResult.categorized} auto-categorized, {folderImportResult.uncategorized} uncategorized</div>
                          {folderImportResult.skipped > 0 && (
                            <div className="text-yellow-500">{folderImportResult.skipped} skipped</div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleFolderImport}
                      disabled={!!folderImportProgress}
                      className={`w-full py-3 rounded-xl font-bold transition-all ${
                        folderImportProgress 
                          ? 'bg-purple-600/50 text-white/50 cursor-not-allowed' 
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      {folderImportProgress ? 'Importing...' : 'Select Folder'}
                    </button>
                    {!isFolderPickerSupported() && (
                      <p className="text-xs text-yellow-500 mt-2 text-center">
                        Folder import requires Chrome or Edge browser
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                    <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>or add single song</span>
                    <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                  </div>
                  
                  {/* Single file upload */}
                  <div className="space-y-4 mb-6">
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-[10px] uppercase tracking-tighter mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>1. Backing Track (MP3)</p>
                      <input type="file" accept=".mp3" ref={audioFileRef} onChange={() => handleFileChange('audio')} className="text-xs w-full" />
                    </div>
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-[10px] uppercase tracking-tighter mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>2. Graphics File (CDG)</p>
                      <input type="file" accept=".cdg" ref={cdgFileRef} onChange={() => handleFileChange('cdg')} className="text-xs w-full" />
                    </div>
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-[10px] uppercase tracking-tighter mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>3. Song Title</p>
                      <input 
                        type="text" 
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Enter song title..."
                        className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ${
                          isDark 
                            ? 'bg-black/40 border border-white/10 focus:ring-white/20 text-white' 
                            : 'bg-white border border-gray-200 focus:ring-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-[10px] uppercase tracking-tighter mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>4. Categories (select one or more)</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.values(allThemes).filter(t => t.id !== 'classic').map(t => {
                          const effectiveCategories = uploadCategories.length > 0 
                            ? uploadCategories 
                            : [settings.themeId === 'classic' ? 'christmas' : settings.themeId];
                          const isSelected = effectiveCategories.includes(t.id as ThemeId);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setUploadCategories(prev => {
                                  const current = prev.length > 0 ? prev : [settings.themeId === 'classic' ? 'christmas' : settings.themeId];
                                  if (current.includes(t.id as ThemeId)) {
                                    if (current.length <= 1) return current;
                                    return current.filter(id => id !== t.id);
                                  } else {
                                    return [...current, t.id as ThemeId];
                                  }
                                });
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 text-white ${
                                isSelected ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                              }`}
                              style={{ 
                                backgroundColor: isSelected ? t.primaryHex : `${t.primaryHex}40`
                              }}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {t.emoji} {t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button 
                    disabled={isProcessing || !stagedFiles.audio || !stagedFiles.cdg}
                    onClick={handleFileUpload}
                    className={`w-full py-4 rounded-2xl font-bold disabled:opacity-20 ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
                  >
                    {isProcessing ? 'Processing...' : 'Add to Collection'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSongs.map(song => {
                const songThemeIds = song.themeIds || (song.themeId ? [song.themeId] : ['christmas']);
                const primaryTheme = allThemes[songThemeIds[0]] || activeTheme;
                return (
                  <SongCard 
                    key={song.id} 
                    song={song} 
                    onSelect={handleSelectSong} 
                    onDelete={handleDeleteSong}
                    onRename={handleRenameSong}
                    onChangeCategories={handleChangeSongCategories}
                    theme={primaryTheme}
                    allThemes={allThemes}
                    isDark={isDark}
                  />
                );
              })}
            </div>

            {filteredSongs.length === 0 && !isUploading && (
              <div className={`text-center py-20 ${isDark ? 'opacity-40' : 'opacity-50'}`}>
                <p className="text-4xl mb-4">📭</p>
                <p>No songs found in this category.</p>
              </div>
            )}
          </div>
        )}

        {currentSong && (
          <KaraokeStage song={currentSong} settings={settings} onExit={() => setCurrentSong(null)} theme={activeTheme} />
        )}
      </main>

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
