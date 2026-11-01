/**
 * useSettings Hook
 * 
 * Manages user settings with localStorage persistence.
 * Handles theme selection, dark mode, category display, and custom categories.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UserSettings, ThemeId, ThemeConfig, CustomCategory } from '../types';
import { THEMES } from '../constants';

const SETTINGS_KEY = 'karaoke_stage_settings_v1';
const LEGACY_SETTINGS_KEY = 'mm_settings_v7';  // For migration

const DEFAULT_SETTINGS: UserSettings = {
  themeId: 'christmas',
  backingVolume: 80,
  darkMode: true,
  categoryDisplay: 'emoji',
  hiddenCategories: [],
  customCategories: []
};

const PARTICLE_TYPES = ['snow', 'confetti', 'egg', 'star', 'bubble', 'bat', 'heart', 'sparkle'];
const DISPLAY_MODES = ['emoji', 'name', 'both'];

/**
 * Validate untrusted persisted settings field-by-field. Spreading raw
 * JSON.parse output over the defaults lets a corrupt or hand-edited
 * localStorage value (e.g. customCategories as a string) crash App render
 * outside any ErrorBoundary.
 */
function sanitizeSettings(parsed: unknown): UserSettings {
  const p = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  const customCategories: CustomCategory[] = Array.isArray(p.customCategories)
    ? p.customCategories.flatMap((c) => {
        if (!c || typeof c !== 'object') return [];
        const cat = c as Record<string, unknown>;
        if (typeof cat.id !== 'string' || typeof cat.name !== 'string') return [];
        return [{
          id: cat.id,
          name: cat.name,
          emoji: typeof cat.emoji === 'string' ? cat.emoji : '🎵',
          primaryHex: typeof cat.primaryHex === 'string' ? cat.primaryHex : '#2563eb',
          particleType: PARTICLE_TYPES.includes(cat.particleType as string)
            ? cat.particleType as CustomCategory['particleType'] : 'star',
        }];
      })
    : [];
  return {
    themeId: typeof p.themeId === 'string' ? p.themeId as ThemeId : DEFAULT_SETTINGS.themeId,
    backingVolume: typeof p.backingVolume === 'number' && Number.isFinite(p.backingVolume)
      ? Math.min(100, Math.max(0, p.backingVolume)) : DEFAULT_SETTINGS.backingVolume,
    darkMode: typeof p.darkMode === 'boolean' ? p.darkMode : DEFAULT_SETTINGS.darkMode,
    categoryDisplay: DISPLAY_MODES.includes(p.categoryDisplay as string)
      ? p.categoryDisplay as UserSettings['categoryDisplay'] : DEFAULT_SETTINGS.categoryDisplay,
    hiddenCategories: strArr(p.hiddenCategories),
    customCategories,
  };
}

function loadSettings(): UserSettings {
  try {
    // Try new key first, then fall back to legacy key for migration
    const saved = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (saved) {
      return sanitizeSettings(JSON.parse(saved));
    }
  } catch (e) {
    console.error('[Settings] Failed to parse:', e);
  }
  return DEFAULT_SETTINGS;
}

export interface UseSettingsReturn {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  allThemes: Record<string, ThemeConfig>;
  activeTheme: ThemeConfig;
  visibleThemes: ThemeConfig[];
  isDark: boolean;
  changeTheme: (id: ThemeId) => void;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Build allThemes including custom categories
  const allThemes = useMemo((): Record<string, ThemeConfig> => {
    const themes: Record<string, ThemeConfig> = { ...THEMES };
    
    (settings.customCategories || []).forEach((cat: CustomCategory) => {
      themes[cat.id] = {
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        primary: 'slate-500',
        primaryHex: cat.primaryHex,
        accent: 'slate-400',
        accentHex: '#94a3b8',
        bgGradient: 'from-slate-950 via-slate-900/20 to-slate-950',
        particleType: cat.particleType,
        font: 'font-sans',
        isCustom: true,
        terminology: {
          brand: cat.name,
          tagline: 'Custom Playlist',
          uploadTitle: 'Add Songs',
          uploadSubtitle: 'Build your playlist',
          emptyTitle: 'No Songs Yet',
          emptySubtitle: 'Add some songs to this category!',
          buttonText: 'Add Songs'
        }
      };
    });
    
    return themes;
  }, [settings.customCategories]);

  const activeTheme = allThemes[settings.themeId] || THEMES.classic;

  // Get visible themes (excluding hidden ones, but always show 'classic')
  const visibleThemes = useMemo((): ThemeConfig[] => {
    const hidden = settings.hiddenCategories || [];
    const themes = Object.values(allThemes) as ThemeConfig[];
    return themes.filter(t => t.id === 'classic' || !hidden.includes(t.id));
  }, [allThemes, settings.hiddenCategories]);

  const isDark = settings.darkMode;

  const changeTheme = (id: ThemeId) => {
    setSettings(prev => ({ ...prev, themeId: id }));
  };

  return {
    settings,
    setSettings,
    allThemes,
    activeTheme,
    visibleThemes,
    isDark,
    changeTheme
  };
}
