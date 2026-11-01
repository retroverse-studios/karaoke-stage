/**
 * Storage Service Interface
 * 
 * Abstracts the underlying storage mechanism (IndexedDB, SQLite, filesystem, etc.)
 * to allow easy swapping for different platforms (web, Electron, Tauri).
 */

import { Song, ThemeId, LyricsFormat } from '../types';

/** Song data as stored in the database (includes binary blobs) */
export interface StoredSong {
  id: string;
  title: string;
  duration: number;
  audioBlob: Blob | File;
  lyricsFormat: LyricsFormat;
  lyricsData: Uint8Array | string;
  cdgData?: Uint8Array;  // Legacy field for backwards compatibility
  isCustom: boolean;
  themeIds: ThemeId[];
  themeId?: ThemeId;  // Legacy field
}

/** Song metadata (no binary data) - used for listing */
export interface SongMetadata {
  id: string;
  title: string;
  duration: number;
  isCustom: boolean;
  themeIds: ThemeId[];
  lyricsFormat: LyricsFormat;
}

/** Song data ready for playback (with URLs and binary data) */
export interface PlayableSong extends Song {
  audioUrl: string;
}

/** Interface for storage implementations */
export interface StorageService {
  /** Initialize the storage (open DB, create tables, etc.) */
  initialize(): Promise<void>;
  
  /** Get all songs (metadata only, no binary data) */
  getAllSongs(): Promise<SongMetadata[]>;
  
  /** Get a single song with full data for playback */
  getSongForPlayback(id: string): Promise<PlayableSong | null>;
  
  /** Save a new song */
  saveSong(song: Omit<StoredSong, 'id'> & { id?: string }): Promise<SongMetadata>;
  
  /** Update song title */
  updateSongTitle(id: string, title: string): Promise<void>;
  
  /** Update song categories */
  updateSongCategories(id: string, themeIds: ThemeId[]): Promise<void>;
  
  /** Delete a song */
  deleteSong(id: string): Promise<void>;
}

/** Generate a unique song ID */
export function generateSongId(): string {
  return `song-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
