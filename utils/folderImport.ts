import { ThemeId } from '../types';
import { matchCategories } from './categoryMatcher';

export interface SongPair {
  name: string;        // Song name (from folder or file name)
  mp3File: File;
  cdgFile: File;
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
async function scanDirectory(
  dirHandle: FileSystemDirectoryHandle,
  pairs: SongPair[],
  onProgress?: (count: number) => void,
  depth: number = 0
): Promise<void> {
  const mp3Files: Map<string, File> = new Map();
  const cdgFiles: Map<string, File> = new Map();
  const subdirs: FileSystemDirectoryHandle[] = [];

  // First pass: collect files and subdirectories
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const nameLower = file.name.toLowerCase();
      const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();

      if (nameLower.endsWith('.mp3')) {
        mp3Files.set(baseName, file);
      } else if (nameLower.endsWith('.cdg')) {
        cdgFiles.set(baseName, file);
      }
    } else if (entry.kind === 'directory') {
      subdirs.push(entry as FileSystemDirectoryHandle);
    }
  }

  // Match mp3+cdg pairs
  for (const [baseName, mp3File] of mp3Files) {
    const cdgFile = cdgFiles.get(baseName);
    if (cdgFile) {
      // Found a pair! Use folder name if at depth > 0, otherwise use file name
      const songName = depth > 0 ? dirHandle.name : mp3File.name.replace(/\.[^/.]+$/, '');
      const cleanName = songName.replace(/ - \d+$/, '').trim();
      
      pairs.push({
        name: cleanName,
        mp3File,
        cdgFile,
        suggestedCategories: matchCategories(cleanName)
      });
      
      onProgress?.(pairs.length);
    }
  }

  // Recurse into subdirectories (limit depth to prevent infinite loops)
  if (depth < 5) {
    for (const subdir of subdirs) {
      await scanDirectory(subdir, pairs, onProgress, depth + 1);
    }
  }
}

/**
 * Open folder picker and scan for karaoke files
 */
export async function pickAndScanFolder(
  onProgress?: (progress: ImportProgress) => void
): Promise<SongPair[]> {
  if (!isFolderPickerSupported()) {
    throw new Error('Folder picker not supported in this browser. Please use Chrome or Edge.');
  }

  // Show folder picker
  const dirHandle = await (window as any).showDirectoryPicker({
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

  await scanDirectory(dirHandle, pairs, (count) => {
    onProgress?.({
      phase: 'scanning',
      scanned: count,
      found: count,
      imported: 0,
      total: 0
    });
  });

  return pairs;
}

/**
 * Import song pairs to IndexedDB
 */
export async function importSongPairs(
  pairs: SongPair[],
  saveSong: (name: string, mp3: File, cdg: File, categories: ThemeId[]) => Promise<boolean>,
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
      
      const success = await saveSong(pair.name, pair.mp3File, pair.cdgFile, categories);
      
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
