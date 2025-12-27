
import { ThemeConfig } from './types';

export const THEMES: Record<string, ThemeConfig> = {
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    emoji: '🎄',
    primary: 'red-600',
    primaryHex: '#dc2626',
    accent: 'emerald-500',
    accentHex: '#10b981',
    bgGradient: 'from-slate-950 via-red-950/20 to-slate-950',
    particleType: 'snow',
    font: 'font-holiday',
    terminology: {
      brand: 'MerryMelodies',
      tagline: 'Professional Christmas Karaoke',
      uploadTitle: 'North Pole File Loader',
      uploadSubtitle: 'Sync your festive tracks',
      emptyTitle: 'The Sleigh is Empty!',
      emptySubtitle: 'Upload some carols to start the party!',
      buttonText: 'Assemble Sleigh'
    }
  },
  easter: {
    id: 'easter',
    name: 'Easter',
    emoji: '🐰',
    primary: 'purple-400',
    primaryHex: '#c084fc',
    accent: 'yellow-400',
    accentHex: '#facc15',
    bgGradient: 'from-slate-950 via-purple-900/20 to-slate-950',
    particleType: 'egg',
    font: 'font-sans',
    terminology: {
      brand: 'EasterEchoes',
      tagline: 'Springtime Singing & Joy',
      uploadTitle: 'Easter Basket Loader',
      uploadSubtitle: 'Add your springtime hits',
      emptyTitle: 'No Eggs in the Basket!',
      emptySubtitle: 'Upload your favorite Easter tracks!',
      buttonText: 'Fill the Basket'
    }
  },
  birthday: {
    id: 'birthday',
    name: 'Birthday',
    emoji: '🎂',
    primary: 'blue-500',
    primaryHex: '#3b82f6',
    accent: 'pink-500',
    accentHex: '#ec4899',
    bgGradient: 'from-slate-950 via-blue-900/20 to-slate-950',
    particleType: 'confetti',
    font: 'font-sans',
    terminology: {
      brand: 'PartyPitch',
      tagline: 'Make a Wish & Sing Along',
      uploadTitle: 'Birthday Gift Box',
      uploadSubtitle: 'The ultimate party playlist',
      emptyTitle: 'No Presents Yet!',
      emptySubtitle: 'Upload your party anthems to begin!',
      buttonText: 'Open the Gifts'
    }
  },
  party: {
    id: 'party',
    name: 'Neon Party',
    emoji: '🕺',
    primary: 'fuchsia-600',
    primaryHex: '#c026d3',
    accent: 'cyan-400',
    accentHex: '#22d3ee',
    bgGradient: 'from-slate-950 via-fuchsia-950/40 to-slate-950',
    particleType: 'bubble',
    font: 'font-sans',
    terminology: {
      brand: 'NightVibe',
      tagline: 'Neon Nights & Karaoke Lights',
      uploadTitle: 'Backstage Pass',
      uploadSubtitle: 'Load the nightclub bangers',
      emptyTitle: 'The Floor is Empty!',
      emptySubtitle: 'Get the party started with some uploads!',
      buttonText: 'Start the Rave'
    }
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    emoji: '🎃',
    primary: 'orange-500',
    primaryHex: '#f97316',
    accent: 'purple-600',
    accentHex: '#9333ea',
    bgGradient: 'from-slate-950 via-orange-950/30 to-slate-950',
    particleType: 'bat',
    font: 'font-sans',
    terminology: {
      brand: 'SpookyTunes',
      tagline: 'Frighteningly Good Karaoke',
      uploadTitle: 'Haunted Jukebox',
      uploadSubtitle: 'Add your spooky soundtracks',
      emptyTitle: 'The Crypt is Empty!',
      emptySubtitle: 'Upload some monster hits!',
      buttonText: 'Summon Songs'
    }
  },
  love: {
    id: 'love',
    name: 'Romance',
    emoji: '💕',
    primary: 'rose-500',
    primaryHex: '#f43f5e',
    accent: 'pink-300',
    accentHex: '#f9a8d4',
    bgGradient: 'from-slate-950 via-rose-950/30 to-slate-950',
    particleType: 'heart',
    font: 'font-sans',
    terminology: {
      brand: 'LoveSongs',
      tagline: 'Sing Your Heart Out',
      uploadTitle: 'Love Letter Loader',
      uploadSubtitle: 'Add your romantic ballads',
      emptyTitle: 'No Love Songs Yet!',
      emptySubtitle: 'Upload your favorite love songs!',
      buttonText: 'Add Romance'
    }
  },
  kids: {
    id: 'kids',
    name: 'Kids',
    emoji: '✨',
    primary: 'sky-500',
    primaryHex: '#0ea5e9',
    accent: 'yellow-400',
    accentHex: '#facc15',
    bgGradient: 'from-slate-950 via-sky-950/30 to-slate-950',
    particleType: 'sparkle',
    font: 'font-sans',
    terminology: {
      brand: 'KidsBop',
      tagline: 'Family Fun Karaoke',
      uploadTitle: 'Magic Music Box',
      uploadSubtitle: 'Add family-friendly favorites',
      emptyTitle: 'No Songs Yet!',
      emptySubtitle: 'Upload some fun songs for everyone!',
      buttonText: 'Add Magic'
    }
  },
  classic: {
    id: 'classic',
    name: 'All Songs',
    emoji: '🎤',
    primary: 'amber-600',
    primaryHex: '#d97706',
    accent: 'slate-400',
    accentHex: '#94a3b8',
    bgGradient: 'from-slate-950 via-amber-950/10 to-slate-950',
    particleType: 'star',
    font: 'font-sans',
    terminology: {
      brand: 'VocalPro',
      tagline: 'The Professional CDG Player',
      uploadTitle: 'Media Librarian',
      uploadSubtitle: 'Manage your pro collection',
      emptyTitle: 'Library Empty',
      emptySubtitle: 'Select your MP3+CDG files to perform.',
      buttonText: 'Load Library'
    }
  }
};
