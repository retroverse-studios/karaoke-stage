/**
 * Karaoke Format Abstraction Layer
 * 
 * Supports multiple karaoke formats:
 * - CDG (CD+Graphics) - Traditional karaoke format with low-res graphics
 * - LRC (Lyrics) - Text-based lyrics with timestamps (future)
 * - More formats can be added as needed
 */

export type KaraokeFormatType = 'cdg' | 'lrc';

/**
 * Render result from a karaoke format renderer
 */
export interface RenderResult {
  /** Whether the frame changed since last render */
  hasContent: boolean;
  /** For graphics-based formats (CDG), the image data to draw */
  imageData?: ImageData;
  /** For text-based formats (LRC), the current lyrics to display */
  lyrics?: LyricsDisplay;
}

/**
 * Lyrics display for text-based formats
 */
export interface LyricsDisplay {
  /** Previous line (for context) */
  previousLine?: string;
  /** Current line being sung */
  currentLine: string;
  /** Next line (for preparation) */
  nextLine?: string;
  /** Word index within current line (for word-by-word highlighting) */
  currentWordIndex?: number;
  /** Progress through current line (0-1) */
  lineProgress: number;
}

/**
 * Parsed LRC line with timing
 */
export interface LrcLine {
  /** Start time in seconds */
  time: number;
  /** Lyrics text */
  text: string;
  /** Word timings for enhanced LRC (optional) */
  words?: { time: number; text: string }[];
}

/**
 * LRC metadata
 */
export interface LrcMetadata {
  artist?: string;
  title?: string;
  album?: string;
  author?: string;  // LRC file creator
  length?: string;  // Song length
  offset?: number;  // Timing offset in ms
}

/**
 * Abstract interface for karaoke format renderers
 */
export interface KaraokeRenderer {
  /** Format type identifier */
  readonly formatType: KaraokeFormatType;
  
  /** Native canvas dimensions (for CDG: 300x216, for LRC: flexible) */
  readonly width: number;
  readonly height: number;
  
  /**
   * Initialize the renderer with format-specific data
   * @param data - Raw data (Uint8Array for CDG, string for LRC)
   */
  load(data: Uint8Array | string): void;
  
  /**
   * Render frame at given time
   * @param timeSeconds - Current playback time in seconds
   * @returns Render result with either imageData or lyrics
   */
  render(timeSeconds: number): RenderResult;
  
  /**
   * Clean up resources
   */
  dispose(): void;
}

/**
 * Factory function type for creating renderers
 */
export type RendererFactory = (data: Uint8Array | string) => KaraokeRenderer;
