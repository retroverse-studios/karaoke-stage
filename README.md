# Merry Karaoke

A modern, themed CDG+MP3 karaoke player built with React 19, TypeScript, and Vite. Store your karaoke collection in the browser and sing along with synchronized lyrics graphics.

## Features

- **CDG Graphics Rendering** - Full support for CDG (CD+Graphics) karaoke files with synchronized lyrics display
- **Themed Categories** - Organize songs by occasion: Christmas, Easter, Birthday, Halloween, Romance, Kids, Neon Party, and more
- **Custom Categories** - Create your own categories with custom names, emojis, colors, and particle effects
- **Bulk Import** - Import entire folders of karaoke files with automatic MP3+CDG pair detection
- **Auto-Categorization** - Smart keyword matching automatically suggests categories based on song titles
- **Dark/Light Mode** - Toggle between dark and light themes
- **Offline Storage** - Songs are stored in IndexedDB, no server required
- **Responsive Design** - Works on desktop and tablet devices

## Getting Started

### Prerequisites

- Node.js 18+
- A modern browser (Chrome or Edge recommended for folder import feature)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/merry-karaoke.git
cd merry-karaoke

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## Usage

### Adding Songs

1. Click **"Add Song"** button
2. **Folder Import** (Chrome/Edge): Click "Select Folder" to import multiple songs at once
3. **Single Upload**: Select an MP3 and CDG file pair, enter a title, and choose categories

### Karaoke File Format

This app uses the CDG+MP3 format, which is the standard for karaoke:
- `.mp3` - The audio track (backing music)
- `.cdg` - The graphics file (synchronized lyrics)

Both files must have the same base name (e.g., `song.mp3` and `song.cdg`).

### Organizing Songs

- Use the category bar to filter songs by theme
- Click the tag icon on a song card to assign/remove categories
- Click the pencil icon to rename songs
- Create custom categories in Settings > Custom Categories

### Settings

Click the gear icon to access:
- **General**: Dark/light mode, category display format
- **Show/Hide**: Toggle visibility of categories in the navigation bar
- **Custom Categories**: Create categories with custom emoji, color, and particle effects

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling (via CDN)
- **IndexedDB** - Client-side storage for songs
- **cdgraphics** - CDG file parsing and rendering
- **File System Access API** - Folder import (Chrome/Edge)

## Project Structure

```
merry-karaoke/
├── components/
│   ├── Atmosphere.tsx    # Falling particle effects
│   ├── KaraokeStage.tsx  # Main karaoke player
│   ├── SettingsModal.tsx # Settings UI
│   └── SongCard.tsx      # Song list item
├── utils/
│   ├── categoryMatcher.ts # Keyword-based categorization
│   └── folderImport.ts    # Folder scanning logic
├── App.tsx               # Main app component
├── constants.tsx         # Theme definitions
├── types.ts              # TypeScript types
└── index.tsx             # Entry point
```

## Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Core playback | Yes | Yes | Yes | Yes |
| Folder import | Yes | Yes | No | No |

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [cdgraphics](https://www.npmjs.com/package/cdgraphics) - CDG parsing library
- CDG format specification for karaoke graphics
