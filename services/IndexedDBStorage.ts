/**
 * IndexedDB Storage Implementation
 * 
 * Implements the StorageService interface using IndexedDB for web browsers.
 */

import { ThemeId } from '../types';
import { 
  StorageService, 
  StoredSong, 
  SongMetadata, 
  PlayableSong,
  generateSongId 
} from './storage';

// Note: Keeping legacy DB name for backwards compatibility with existing installations
const DB_NAME = 'MerryMelodiesDB_v1';
const STORE_NAME = 'songs';

/** IndexedDB implementation of StorageService */
class IndexedDBStorage implements StorageService {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private getDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  async getAllSongs(): Promise<SongMetadata[]> {
    const db = this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const songs: SongMetadata[] = request.result.map((s: StoredSong & { themeId?: ThemeId }) => ({
          id: s.id,
          title: s.title,
          duration: s.duration || 0,
          isCustom: s.isCustom ?? true,
          themeIds: s.themeIds || (s.themeId ? [s.themeId] : ['christmas']),
          lyricsFormat: s.lyricsFormat || 'cdg',
        }));
        resolve(songs);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getSongForPlayback(id: string): Promise<PlayableSong | null> {
    const db = this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const s = request.result as (StoredSong & { audioBlob?: Blob }) | undefined;
        if (!s) {
          resolve(null);
          return;
        }

        resolve({
          id: s.id,
          title: s.title,
          duration: s.duration || 0,
          isCustom: s.isCustom ?? true,
          themeIds: s.themeIds || (s.themeId ? [s.themeId] : ['christmas']),
          audioUrl: s.audioBlob ? URL.createObjectURL(s.audioBlob) : '',
          lyricsFormat: s.lyricsFormat || 'cdg',
          lyricsData: s.lyricsData || s.cdgData,  // Support legacy cdgData field
          cdgData: s.cdgData,  // Keep for backwards compatibility
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveSong(songData: Omit<StoredSong, 'id'> & { id?: string }): Promise<SongMetadata> {
    const db = this.getDB();
    const id = songData.id || generateSongId();

    // Only lyricsData is written; the legacy cdgData field is read-side
    // fallback only — persisting both would store every CDG file twice
    const persistentData: StoredSong = {
      ...songData,
      id,
      cdgData: undefined,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(persistentData);

      transaction.oncomplete = () => {
        const metadata: SongMetadata = {
          id,
          title: songData.title,
          duration: songData.duration,
          isCustom: songData.isCustom,
          themeIds: songData.themeIds,
          lyricsFormat: songData.lyricsFormat,
        };
        resolve(metadata);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  async updateSongTitle(id: string, title: string): Promise<void> {
    const db = this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const song = request.result;
        if (song) {
          song.title = title;
          // Migrate legacy records that stored the CDG bytes twice
          if (song.lyricsData && song.cdgData) delete song.cdgData;
          store.put(song);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async updateSongCategories(id: string, themeIds: ThemeId[]): Promise<void> {
    const db = this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const song = request.result;
        if (song) {
          song.themeIds = themeIds;
          // Clean up legacy fields
          delete song.themeId;
          if (song.lyricsData && song.cdgData) delete song.cdgData;
          store.put(song);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteSong(id: string): Promise<void> {
    const db = this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export a singleton instance
export const indexedDBStorage = new IndexedDBStorage();

// Also export the class for testing or multiple instances
export { IndexedDBStorage };
