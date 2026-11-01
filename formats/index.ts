/**
 * Karaoke Format Module
 * 
 * Provides a unified interface for different karaoke formats:
 * - CDG (CD+Graphics) - Traditional karaoke format
 * - LRC (Lyrics) - Text-based lyrics format
 * 
 * Usage:
 *   const renderer = createRenderer('cdg', cdgData);
 *   const result = renderer.render(currentTimeInSeconds);
 */

export * from './types';
export { CdgRenderer, createCdgRenderer } from './CdgRenderer';
export { LrcRenderer, createLrcRenderer } from './LrcRenderer';

import { KaraokeRenderer, KaraokeFormatType } from './types';
import { CdgRenderer } from './CdgRenderer';
import { LrcRenderer } from './LrcRenderer';

/**
 * Create a renderer for the specified format
 * @param format - The karaoke format type
 * @param data - Format-specific data (Uint8Array for CDG, string for LRC)
 */
export function createRenderer(format: KaraokeFormatType, data: Uint8Array | string): KaraokeRenderer {
  switch (format) {
    case 'cdg':
      if (typeof data === 'string') {
        throw new Error('CDG format requires binary data (Uint8Array)');
      }
      const cdgRenderer = new CdgRenderer();
      cdgRenderer.load(data);
      return cdgRenderer;
      
    case 'lrc':
      const lrcRenderer = new LrcRenderer();
      lrcRenderer.load(data);
      return lrcRenderer;
      
    default:
      throw new Error(`Unknown karaoke format: ${format}`);
  }
}

/**
 * Detect format from file extension
 * @param filename - The filename or extension
 */
export function detectFormat(filename: string): KaraokeFormatType | null {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'cdg':
      return 'cdg';
    case 'lrc':
      return 'lrc';
    default:
      return null;
  }
}

/**
 * Check if a format is graphics-based (renders to canvas) or text-based (renders lyrics)
 */
export function isGraphicsFormat(format: KaraokeFormatType): boolean {
  return format === 'cdg';
}

