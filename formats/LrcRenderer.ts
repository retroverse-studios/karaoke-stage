/**
 * LRC (Lyrics) Renderer
 * 
 * Parses and renders LRC format lyrics files.
 * LRC is a text-based format with timestamps for each line.
 * 
 * Basic LRC format:
 *   [mm:ss.xx]Lyrics line here
 * 
 * Enhanced LRC (word-level timing):
 *   [mm:ss.xx]<mm:ss.xx>Word <mm:ss.xx>by <mm:ss.xx>word
 * 
 * Metadata tags:
 *   [ar:Artist Name]
 *   [ti:Track Title]
 *   [al:Album Name]
 *   [offset:+/- ms]
 */

import { KaraokeRenderer, RenderResult, KaraokeFormatType, LrcLine, LrcMetadata, LyricsDisplay } from './types';

export class LrcRenderer implements KaraokeRenderer {
  readonly formatType: KaraokeFormatType = 'lrc';
  readonly width = 800;   // Flexible for text
  readonly height = 600;  // Flexible for text
  
  private lines: LrcLine[] = [];
  private metadata: LrcMetadata = {};
  private offsetMs: number = 0;
  
  /**
   * Load and parse LRC data
   * @param data - String containing LRC file contents
   */
  load(data: Uint8Array | string): void {
    const text = typeof data === 'string' 
      ? data 
      : new TextDecoder().decode(data);
    
    this.parse(text);
  }
  
  /**
   * Parse LRC text into structured data
   */
  private parse(text: string): void {
    this.lines = [];
    this.metadata = {};
    this.offsetMs = 0;

    const lines = text.split(/\r?\n/);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Check for metadata tags
      const metaMatch = trimmed.match(/^\[([a-z]+):(.+)\]$/i);
      if (metaMatch) {
        const [, tag, value] = metaMatch;
        switch (tag.toLowerCase()) {
          case 'ar': this.metadata.artist = value.trim(); break;
          case 'ti': this.metadata.title = value.trim(); break;
          case 'al': this.metadata.album = value.trim(); break;
          case 'au': this.metadata.author = value.trim(); break;
          case 'length': this.metadata.length = value.trim(); break;
          case 'offset': 
            this.offsetMs = parseInt(value.trim(), 10) || 0;
            this.metadata.offset = this.offsetMs;
            break;
        }
        continue;
      }
      
      // Parse timestamp(s) and lyrics
      // Handles both [mm:ss.xx]lyrics and [mm:ss.xx][mm:ss.xx]lyrics (multiple timestamps)
      const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
      const timestamps: number[] = [];
      let match;
      let lastIndex = 0;
      
      while ((match = timeRegex.exec(trimmed)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const centiseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const timeSeconds = minutes * 60 + seconds + centiseconds / 1000;
        timestamps.push(timeSeconds);
        lastIndex = timeRegex.lastIndex;
      }
      
      if (timestamps.length === 0) continue;

      const lyrics = trimmed.slice(lastIndex).trim();
      // Timed empty lines are kept: they blank the display during instrumental breaks

      // Parse word-level timing if present (enhanced LRC)
      const words = lyrics ? this.parseWordTimings(lyrics, timestamps[0]) : null;

      // Add a line entry for each timestamp (some LRC files repeat lines).
      // Words are cloned per entry so the offset pass below adjusts each once.
      for (const time of timestamps) {
        this.lines.push({
          time,
          text: words ? words.map(w => w.text).join('') : lyrics,
          words: words ? words.map(w => ({ ...w })) : undefined
        });
      }
    }

    // Apply [offset:] uniformly after parsing — the tag may legally appear
    // anywhere in the file. Positive offset shifts lyrics EARLIER by convention.
    if (this.offsetMs !== 0) {
      const offsetSec = this.offsetMs / 1000;
      for (const line of this.lines) {
        line.time -= offsetSec;
        line.words?.forEach(w => { w.time -= offsetSec; });
      }
    }

    // Sort by time
    this.lines.sort((a, b) => a.time - b.time);
  }
  
  /**
   * Parse enhanced LRC word timings
   * Format: <mm:ss.xx>word <mm:ss.xx>word
   */
  private parseWordTimings(text: string, lineTime: number): { time: number; text: string }[] | null {
    const wordRegex = /<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>/g;
    const words: { time: number; text: string }[] = [];

    let match;
    let lastIndex = 0;

    while ((match = wordRegex.exec(text)) !== null) {
      // Get text before this timestamp (belongs to previous word or is whitespace)
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore) {
        if (words.length > 0) {
          words[words.length - 1].text += textBefore;
        } else {
          // Text before the first word tag is sung from the line start
          words.push({ time: lineTime, text: textBefore });
        }
      }

      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const timeSeconds = minutes * 60 + seconds + centiseconds / 1000;
      
      words.push({ time: timeSeconds, text: '' });
      lastIndex = wordRegex.lastIndex;
    }
    
    // Get remaining text after last timestamp
    if (words.length > 0 && lastIndex < text.length) {
      words[words.length - 1].text += text.slice(lastIndex);
    }
    
    return words.length > 0 ? words : null;
  }
  
  /**
   * Find the current line index for a given time
   */
  private findCurrentLineIndex(timeSeconds: number): number {
    // Binary search for efficiency
    let left = 0;
    let right = this.lines.length - 1;
    let result = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.lines[mid].time <= timeSeconds) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return result;
  }
  
  /**
   * Render lyrics at given time
   * @param timeSeconds - Current playback time in seconds
   */
  render(timeSeconds: number): RenderResult {
    if (this.lines.length === 0) {
      return { hasContent: false };
    }
    
    const currentIndex = this.findCurrentLineIndex(timeSeconds);
    
    if (currentIndex < 0) {
      // Before first line
      return {
        hasContent: true,
        lyrics: {
          currentLine: '',
          nextLine: this.lines[0]?.text,
          lineProgress: 0
        }
      };
    }
    
    const currentLine = this.lines[currentIndex];
    const nextLine = this.lines[currentIndex + 1];
    const prevLine = currentIndex > 0 ? this.lines[currentIndex - 1] : undefined;
    
    // Calculate progress through current line; duplicate consecutive
    // timestamps would divide by zero, so treat those as complete
    const lineStart = currentLine.time;
    const lineEnd = nextLine?.time ?? (lineStart + 5); // Assume 5 seconds if last line
    const lineProgress = lineEnd > lineStart
      ? Math.min(1, (timeSeconds - lineStart) / (lineEnd - lineStart))
      : 1;
    
    // Calculate current word index if word timing available
    let currentWordIndex: number | undefined;
    if (currentLine.words) {
      for (let i = currentLine.words.length - 1; i >= 0; i--) {
        if (currentLine.words[i].time <= timeSeconds) {
          currentWordIndex = i;
          break;
        }
      }
    }
    
    return {
      hasContent: true,
      lyrics: {
        previousLine: prevLine?.text,
        currentLine: currentLine.text,
        nextLine: nextLine?.text,
        words: currentLine.words?.map(w => w.text),
        currentWordIndex,
        lineProgress
      }
    };
  }
  
  /**
   * Get parsed metadata
   */
  getMetadata(): LrcMetadata {
    return { ...this.metadata };
  }
  
  /**
   * Get all parsed lines (useful for debugging/display)
   */
  getLines(): LrcLine[] {
    return [...this.lines];
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.lines = [];
    this.metadata = {};
  }
}

/**
 * Factory function to create an LRC renderer
 */
export function createLrcRenderer(data: string | Uint8Array): LrcRenderer {
  const renderer = new LrcRenderer();
  renderer.load(data);
  return renderer;
}
