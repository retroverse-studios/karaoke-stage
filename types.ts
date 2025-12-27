
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type ParticleType = 'snow' | 'confetti' | 'egg' | 'star' | 'bubble' | 'bat' | 'heart' | 'sparkle';

export type BuiltInThemeId = 'christmas' | 'easter' | 'birthday' | 'party' | 'halloween' | 'love' | 'kids' | 'classic';

// ThemeId can be a built-in or a custom category (prefixed with 'custom-')
export type ThemeId = BuiltInThemeId | `custom-${string}`;

export interface ThemeConfig {
  id: string;
  name: string;
  emoji: string;
  primary: string; // Tailwind class
  primaryHex: string; // Hex for inline styles
  accent: string;  // Tailwind class
  accentHex: string;
  bgGradient: string;
  particleType: ParticleType;
  font: string;
  isCustom?: boolean;
  terminology: {
    brand: string;
    tagline: string;
    uploadTitle: string;
    uploadSubtitle: string;
    emptyTitle: string;
    emptySubtitle: string;
    buttonText: string;
  };
}

export interface CustomCategory {
  id: string;
  name: string;
  emoji: string;
  primaryHex: string;
  particleType: ParticleType;
}

/** Supported karaoke lyrics/graphics formats */
export type LyricsFormat = 'cdg' | 'lrc';

export interface Song {
  id: string;
  title: string;
  duration: number;
  difficulty: Difficulty;
  description: string;
  audioUrl?: string;        // Only set when loaded for playback
  lyricsFormat: LyricsFormat;  // What format the lyrics/graphics are in
  lyricsData?: Uint8Array | string;  // CDG = Uint8Array, LRC = string (only set when loaded for playback)
  isCustom: boolean;
  themeIds: ThemeId[];
  /** @deprecated Use themeIds instead */
  themeId?: ThemeId;
  /** @deprecated Use lyricsData instead */
  cdgData?: Uint8Array;
}

export type CategoryDisplayMode = 'emoji' | 'name' | 'both';

export interface UserSettings {
  themeId: ThemeId;
  backingVolume: number;
  darkMode: boolean;
  categoryDisplay: CategoryDisplayMode;
  hiddenCategories: string[]; // Category IDs to hide from the bar
  customCategories: CustomCategory[];
}

export interface PerformanceStats {
  linesSung: number;
  totalLines: number;
  startTime: number;
}
