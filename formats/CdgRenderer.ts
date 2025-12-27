/**
 * CDG (CD+Graphics) Renderer
 * 
 * Wraps the cdgraphics library to implement the KaraokeRenderer interface.
 * CDG is the traditional karaoke format with 288x192 resolution, 16 colors.
 */

import CDGraphics from 'cdgraphics';
import { KaraokeRenderer, RenderResult, KaraokeFormatType } from './types';

export class CdgRenderer implements KaraokeRenderer {
  readonly formatType: KaraokeFormatType = 'cdg';
  readonly width = 300;   // CDG native width
  readonly height = 216;  // CDG native height
  
  private cdg: CDGraphics | null = null;
  
  /**
   * Load CDG data
   * @param data - Uint8Array containing CDG file contents
   */
  load(data: Uint8Array | string): void {
    if (typeof data === 'string') {
      throw new Error('CDG renderer requires binary data (Uint8Array), not string');
    }
    
    // Convert Uint8Array to ArrayBuffer for cdgraphics library
    const buffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    );
    
    this.cdg = new CDGraphics(buffer);
  }
  
  /**
   * Render frame at given time
   * @param timeSeconds - Current playback time in seconds
   */
  render(timeSeconds: number): RenderResult {
    if (!this.cdg) {
      return { hasContent: false };
    }
    
    const frame = this.cdg.render(timeSeconds);
    
    return {
      hasContent: frame.isChanged,
      imageData: frame.imageData
    };
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.cdg = null;
  }
}

/**
 * Factory function to create a CDG renderer
 */
export function createCdgRenderer(data: Uint8Array): CdgRenderer {
  const renderer = new CdgRenderer();
  renderer.load(data);
  return renderer;
}
