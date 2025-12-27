/**
 * Services Module
 * 
 * Re-exports the storage service interface and default implementation.
 * For Electron/Tauri, you can swap indexedDBStorage with a different implementation.
 */

export * from './storage';
export { indexedDBStorage, IndexedDBStorage } from './IndexedDBStorage';

// Default storage instance - swap this for different platforms
import { indexedDBStorage } from './IndexedDBStorage';
export const storage = indexedDBStorage;
