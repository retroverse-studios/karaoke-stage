import { ThemeId, BuiltInThemeId } from '../types';

// Keyword lists for auto-categorization
const CATEGORY_KEYWORDS: Record<BuiltInThemeId, string[]> = {
  christmas: [
    'christmas', 'xmas', 'jingle', 'santa', 'rudolph', 'snowman', 'frosty',
    'sleigh', 'reindeer', 'noel', 'carol', 'silent night', 'holy night',
    'deck the halls', 'mistletoe', 'winter wonderland', 'white christmas',
    'feliz navidad', 'auld lang syne', 'new year', 'holiday'
  ],
  easter: [
    'easter', 'bunny', 'spring', 'rabbit', 'egg hunt', 'resurrection',
    'hallelujah', 'amazing grace', 'hymn'
  ],
  birthday: [
    'birthday', 'happy birthday', 'celebration', 'party time', 'celebrate'
  ],
  party: [
    'party', 'dance', 'disco', 'club', 'dj', 'remix', 'rave', 'techno',
    'edm', 'house music', 'get lucky', 'uptown funk', 'boogie'
  ],
  halloween: [
    'halloween', 'spooky', 'scary', 'ghost', 'monster', 'thriller',
    'zombie', 'witch', 'vampire', 'haunted', 'creepy', 'supernatural',
    'nightmare', 'horror', 'werewolf', 'dracula', 'frankenstein'
  ],
  love: [
    'love', 'heart', 'valentine', 'romance', 'romantic', 'kiss', 'darling',
    'sweetheart', 'wedding', 'marry', 'forever', 'always', 'baby',
    'beautiful', 'angel', 'devotion', 'passion', 'soulmate'
  ],
  kids: [
    'kids', 'children', 'disney', 'frozen', 'moana', 'lion king', 'aladdin',
    'little mermaid', 'toy story', 'pixar', 'sesame street', 'barney',
    'wheels on the bus', 'twinkle', 'abc', 'alphabet', 'nursery',
    'baby shark', 'cocomelon', 'paw patrol', 'peppa'
  ],
  classic: [] // "All Songs" - no keywords, it's the catch-all
};

/**
 * Attempts to match a song title to categories based on keywords.
 * Returns an array of matching category IDs.
 * If no matches found, returns empty array (song will be uncategorized).
 */
function keywordPattern(keyword: string): RegExp {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Word-ish boundaries so 'love' doesn't fire inside "Glove" and 'abc'
  // doesn't fire inside arbitrary letter runs
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`);
}

export function matchCategories(title: string): ThemeId[] {
  const normalizedTitle = title.toLowerCase();
  const matches: ThemeId[] = [];

  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (categoryId === 'classic') continue; // Skip "All Songs"

    for (const keyword of keywords) {
      if (keywordPattern(keyword).test(normalizedTitle)) {
        matches.push(categoryId as ThemeId);
        break; // Only add each category once
      }
    }
  }

  return matches;
}

