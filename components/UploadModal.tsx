/**
 * UploadModal Component
 * 
 * Modal for uploading songs - supports both folder import and single file upload.
 */

import React, { useState, useRef } from 'react';
import { ThemeId, ThemeConfig } from '../types';
import { pickAndScanFolder, importSongPairs, isFolderPickerSupported, ImportProgress, ImportResult } from '../utils/folderImport';
import { SongMetadata } from '../services';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongAdded: (metadata: SongMetadata, playImmediately?: { audioFile: File; cdgData: Uint8Array }) => void;
  onBulkImport: (name: string, mp3File: File, cdgFile: File, categories: ThemeId[]) => Promise<boolean>;
  allThemes: Record<string, ThemeConfig>;
  activeTheme: ThemeConfig;
  currentThemeId: ThemeId;
  isDark: boolean;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSongAdded,
  onBulkImport,
  allThemes,
  activeTheme,
  currentThemeId,
  isDark
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<{ audio?: File; cdg?: File }>({});
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategories, setUploadCategories] = useState<ThemeId[]>([]);
  
  const [folderImportProgress, setFolderImportProgress] = useState<ImportProgress | null>(null);
  const [folderImportResult, setFolderImportResult] = useState<ImportResult | null>(null);

  const audioFileRef = useRef<HTMLInputElement>(null);
  const cdgFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setUploadTitle('');
    setUploadCategories([]);
    setStagedFiles({});
    setFolderImportProgress(null);
    setFolderImportResult(null);
    onClose();
  };

  const handleFileChange = (type: 'audio' | 'cdg') => {
    const file = type === 'audio' 
      ? audioFileRef.current?.files?.[0] 
      : cdgFileRef.current?.files?.[0];
    
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

      const title = uploadTitle.trim() || audio.name.replace(/\.[^/.]+$/, "").replace(/ - \d+$/, "");
      const themeIds = uploadCategories.length > 0 
        ? uploadCategories 
        : [currentThemeId === 'classic' ? 'christmas' : currentThemeId];

      // Call parent's bulk import which handles storage
      const success = await onBulkImport(title, audio, cdg, themeIds);
      
      if (success) {
        setStagedFiles({});
        setUploadTitle('');
        setUploadCategories([]);
        setIsProcessing(false);
        handleClose();
      } else {
        alert("Error saving song.");
        setIsProcessing(false);
      }
    } catch (err) {
      alert("Error saving song.");
      setIsProcessing(false);
    }
  };

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
      const result = await importSongPairs(pairs, onBulkImport, (progress) => {
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
      console.error("Folder import failed", err);
      alert(`Folder import failed: ${err.message}`);
      setFolderImportProgress(null);
    }
  };

  const getEffectiveCategories = () => {
    return uploadCategories.length > 0 
      ? uploadCategories 
      : [currentThemeId === 'classic' ? 'christmas' : currentThemeId];
  };

  const themes = Object.values(allThemes) as ThemeConfig[];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
      <div className={`rounded-[2.5rem] p-8 max-w-lg w-full relative max-h-[90vh] overflow-y-auto ${
        isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        <button 
          onClick={handleClose} 
          className={`absolute top-6 right-6 text-2xl ${
            isDark ? 'opacity-50 hover:opacity-100' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          x
        </button>
        
        <h2 className={`text-3xl ${activeTheme.font} text-center mb-6 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Add Songs
        </h2>
        
        {/* Folder Import Section */}
        <div className={`p-4 rounded-2xl border mb-6 ${
          isDark ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Import from Folder
              </h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Scan a folder for MP3+CDG pairs
              </p>
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
          <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            or add single song
          </span>
          <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
        </div>
        
        {/* Single file upload */}
        <div className="space-y-4 mb-6">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-[10px] uppercase tracking-tighter mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              1. Backing Track (MP3)
            </p>
            <input 
              type="file" 
              accept=".mp3" 
              ref={audioFileRef} 
              onChange={() => handleFileChange('audio')} 
              className="text-xs w-full" 
            />
          </div>
          
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-[10px] uppercase tracking-tighter mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              2. Graphics File (CDG)
            </p>
            <input 
              type="file" 
              accept=".cdg" 
              ref={cdgFileRef} 
              onChange={() => handleFileChange('cdg')} 
              className="text-xs w-full" 
            />
          </div>
          
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-[10px] uppercase tracking-tighter mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              3. Song Title
            </p>
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
            <p className={`text-[10px] uppercase tracking-tighter mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              4. Categories (select one or more)
            </p>
            <div className="flex flex-wrap gap-2">
              {themes.filter(t => t.id !== 'classic').map(t => {
                const effectiveCategories = getEffectiveCategories();
                const isSelected = effectiveCategories.includes(t.id as ThemeId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setUploadCategories(prev => {
                        const current = prev.length > 0 
                          ? prev 
                          : [currentThemeId === 'classic' ? 'christmas' : currentThemeId];
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
          className={`w-full py-4 rounded-2xl font-bold disabled:opacity-20 ${
            isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
          }`}
        >
          {isProcessing ? 'Processing...' : 'Add to Collection'}
        </button>
      </div>
    </div>
  );
};

export default UploadModal;
