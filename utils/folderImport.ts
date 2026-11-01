import { ThemeId } from '../types';
import { matchCategories } from './categoryMatcher';

// File System Access API (WICG) — not yet in TypeScript's DOM lib
declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
}

export interface SongPair {
  name: string;        // Song name (from folder or file name)
  mp3File: File;
  lyricsFile: File;    // .cdg or .lrc
  suggestedCategories: ThemeId[];
}

export interface ImportProgress {
  phase: 'scanning' | 'importing' | 'done';
  scanned: number;
  found: number;
  imported: number;
  total: number;
  currentFile?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  categorized: number;
  uncategorized: number;
  errors: string[];
}

/**
 * Check if File System Access API is supported
 */
export function isFolderPickerSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * Recursively scan a directory for mp3+cdg pairs
 */
interface ScanState {
  /** Files looked at so far */
  scanned: number;
  /** Pairs found so far */
  found: number;
  /** True when a directory was skipped because of the depth limit */
  depthLimited: boolean;
}

async function scanDirectory(
  dirHandle: FileSystemDirectoryHandle,
  pairs: SongPair[],
  state: ScanState,
  onProgress?: (state: ScanState) => void,
  depth: number = 0
): Promise<void> {
  const mp3Files: Map<string, File> = new Map();
  const cdgFiles: Map<string, File> = new Map();
  const lrcFiles: Map<string, File> = new Map();
  const subdirs: FileSystemDirectoryHandle[] = [];

  // First pass: collect files and subdirectories
  for await (const entry of dirHandle.values()) {
    // Skip macOS AppleDouble sidecars and hidden files (common on exFAT
    // drives): '._Song.mp3' would otherwise pair into a junk song
    if (entry.name.startsWith('._') || entry.name.startsWith('.')) continue;
    if (entry.kind === 'file') {
      state.scanned++;
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const nameLower = file.name.toLowerCase();
      const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();

      if (nameLower.endsWith('.mp3')) {
        mp3Files.set(baseName, file);
      } else if (nameLower.endsWith('.cdg')) {
        cdgFiles.set(baseName, file);
      } else if (nameLower.endsWith('.lrc')) {
        lrcFiles.set(baseName, file);
      }
    } else if (entry.kind === 'directory') {
      subdirs.push(entry as FileSystemDirectoryHandle);
    }
  }

  // Match each MP3 with a lyrics file of the same base name (CDG preferred over LRC)
  const found: { mp3File: File; lyricsFile: File }[] = [];
  for (const [baseName, mp3File] of mp3Files) {
    const lyricsFile = cdgFiles.get(baseName) ?? lrcFiles.get(baseName);
    if (lyricsFile) {
      found.push({ mp3File, lyricsFile });
    }
  }

  for (const { mp3File, lyricsFile } of found) {
    // A subfolder holding a single pair is usually named after the song;
    // a folder with many pairs is an album — keep per-file names there
    const songName = depth > 0 && found.length === 1
      ? dirHandle.name
      : mp3File.name.replace(/\.[^/.]+$/, '');
    const cleanName = songName.replace(/ - \d+$/, '').trim();

    pairs.push({
      name: cleanName,
      mp3File,
      lyricsFile,
      suggestedCategories: matchCategories(cleanName)
    });
    state.found = pairs.length;

    onProgress?.({ ...state });
  }

  // Recurse into subdirectories (limit depth to prevent infinite loops)
  if (depth < 5) {
    for (const subdir of subdirs) {
      await scanDirectory(subdir, pairs, state, onProgress, depth + 1);
    }
  } else if (subdirs.length > 0) {
    state.depthLimited = true;
  }
}

/**
 * Open folder picker and scan for karaoke files
 */
export async function pickAndScanFolder(
  onProgress?: (progress: ImportProgress) => void
): Promise<{ pairs: SongPair[]; depthLimited: boolean }> {
  if (!window.showDirectoryPicker) {
    throw new Error('Folder picker not supported in this browser. Please use Chrome or Edge.');
  }

  // Show folder picker
  const dirHandle = await window.showDirectoryPicker({
    mode: 'read'
  });

  const pairs: SongPair[] = [];
  
  onProgress?.({
    phase: 'scanning',
    scanned: 0,
    found: 0,
    imported: 0,
    total: 0
  });

  const state: ScanState = { scanned: 0, found: 0, depthLimited: false };
  await scanDirectory(dirHandle, pairs, state, (s) => {
    onProgress?.({
      phase: 'scanning',
      scanned: s.scanned,
      found: s.found,
      imported: 0,
      total: 0
    });
  });

  return { pairs, depthLimited: state.depthLimited };
}

/**
 * Import song pairs to IndexedDB
 */
export async function importSongPairs(
  pairs: SongPair[],
  saveSong: (name: string, mp3: File, lyrics: File, categories: ThemeId[]) => Promise<boolean>,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    categorized: 0,
    uncategorized: 0,
    errors: []
  };

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    
    onProgress?.({
      phase: 'importing',
      scanned: pairs.length,
      found: pairs.length,
      imported: i,
      total: pairs.length,
      currentFile: pair.name
    });

    try {
      // Use suggested categories, or default to empty (uncategorized)
      const categories = pair.suggestedCategories.length > 0 
        ? pair.suggestedCategories 
        : [];
      
      const success = await saveSong(pair.name, pair.mp3File, pair.lyricsFile, categories);
      
      if (success) {
        result.imported++;
        if (categories.length > 0) {
          result.categorized++;
        } else {
          result.uncategorized++;
        }
      } else {
        result.skipped++;
      }
    } catch (err) {
      result.errors.push(`${pair.name}: ${err}`);
      result.skipped++;
    }
  }

  onProgress?.({
    phase: 'done',
    scanned: pairs.length,
    found: pairs.length,
    imported: result.imported,
    total: pairs.length
  });

  return result;
}
