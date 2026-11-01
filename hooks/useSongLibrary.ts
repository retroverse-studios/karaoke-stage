/**
 * useSongLibrary Hook
 * 
 * Manages the song library: loading, CRUD operations, and filtering.
 * Abstracts all storage interactions for the song library.
 */

import { useState, useEffect, useCallback } from 'react';
import { Song, ThemeId } from '../types';
import { storage, SongMetadata } from '../services';
import { detectFormat } from '../formats';

export interface UseSongLibraryReturn {
  /** All songs in the library (metadata only) */
  songs: SongMetadata[];
  /** Whether the library is loading */
  isLoading: boolean;
  /** Currently playing song (full data) */
  currentSong: Song | null;
  /** Select a song for playback */
  selectSong: (song: SongMetadata) => Promise<void>;
  /** Clear the current song (exit playback) */
  clearCurrentSong: () => void;
  /** Delete a song */
  deleteSong: (id: string) => Promise<void>;
  /** Rename a song */
  renameSong: (id: string, newTitle: string) => Promise<void>;
  /** Change song categories */
  changeSongCategories: (id: string, themeIds: ThemeId[]) => Promise<void>;
  /** Add a new song (returns metadata) */
  addSong: (data: {
    title: string;
    audioFile: File;
    lyricsFile: File;
    themeIds: ThemeId[];
  }) => Promise<SongMetadata>;
}

export function useSongLibrary(): UseSongLibraryReturn {
  const [songs, setSongs] = useState<SongMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);

  // Load library on mount
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        await storage.initialize();
        const loadedSongs = await storage.getAllSongs();
        setSongs(loadedSongs);
      } catch (err) {
        console.error("Failed to load library", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLibrary();
  }, []);

  const selectSong = useCallback(async (song: SongMetadata) => {
    try {
      const fullSong = await storage.getSongForPlayback(song.id);
      if (fullSong) {
        setCurrentSong(fullSong);
      } else {
        alert("Failed to load song data");
      }
    } catch (err) {
      console.error("Failed to load song for playback", err);
      alert("Failed to load song data");
    }
  }, []);

  const clearCurrentSong = useCallback(() => {
    setCurrentSong(prev => {
      // Release the blob URL so the MP3 isn't pinned in memory for the session
      if (prev?.audioUrl) URL.revokeObjectURL(prev.audioUrl);
      return null;
    });
  }, []);

  // Optimistic updates are rolled back from storage when persistence fails,
  // so the UI never silently diverges from IndexedDB until the next reload
  const resyncAfterFailure = useCallback(async (action: string, err: unknown) => {
    console.error(`Failed to ${action}`, err);
    try {
      setSongs(await storage.getAllSongs());
    } catch { /* keep current UI state if even the reload fails */ }
    alert(`Couldn't ${action}. Storage may be full or unavailable — your library was reloaded from disk.`);
  }, []);

  const deleteSong = useCallback(async (id: string) => {
    // Optimistic UI update
    setSongs(prev => prev.filter(s => s.id !== id));
    setCurrentSong(prev => {
      if (prev?.id !== id) return prev;
      if (prev.audioUrl) URL.revokeObjectURL(prev.audioUrl);
      return null;
    });

    // Persist to storage
    try {
      await storage.deleteSong(id);
    } catch (err) {
      await resyncAfterFailure('delete the song', err);
    }
  }, [resyncAfterFailure]);

  const renameSong = useCallback(async (id: string, newTitle: string) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    // Optimistic UI update
    setSongs(prev => prev.map(s => 
      s.id === id ? { ...s, title: trimmedTitle } : s
    ));

    // Persist to storage
    try {
      await storage.updateSongTitle(id, trimmedTitle);
    } catch (err) {
      await resyncAfterFailure('rename the song', err);
    }
  }, [resyncAfterFailure]);

  const changeSongCategories = useCallback(async (id: string, themeIds: ThemeId[]) => {
    // Optimistic UI update
    setSongs(prev => prev.map(s => 
      s.id === id ? { ...s, themeIds } : s
    ));

    // Persist to storage
    try {
      await storage.updateSongCategories(id, themeIds);
    } catch (err) {
      await resyncAfterFailure('change the song categories', err);
    }
  }, [resyncAfterFailure]);

  const addSong = useCallback(async (data: {
    title: string;
    audioFile: File;
    lyricsFile: File;
    themeIds: ThemeId[];
  }): Promise<SongMetadata> => {
    const format = detectFormat(data.lyricsFile.name);
    if (!format) {
      throw new Error(`Unsupported lyrics file: ${data.lyricsFile.name}`);
    }

    // CDG is binary; LRC is text
    const lyricsData = format === 'cdg'
      ? new Uint8Array(await data.lyricsFile.arrayBuffer())
      : await data.lyricsFile.text();

    const metadata = await storage.saveSong({
      title: data.title,
      duration: 0,
      audioBlob: data.audioFile,
      lyricsFormat: format,
      lyricsData,
      isCustom: true,
      themeIds: data.themeIds
    });

    setSongs(prev => [metadata, ...prev]);
    return metadata;
  }, []);

  return {
    songs,
    isLoading,
    currentSong,
    selectSong,
    clearCurrentSong,
    deleteSong,
    renameSong,
    changeSongCategories,
    addSong
  };
}
