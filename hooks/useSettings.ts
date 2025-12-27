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

function loadSettings(): UserSettings {
  try {
    // Try new key first, then fall back to legacy key for migration
    const saved = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
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
