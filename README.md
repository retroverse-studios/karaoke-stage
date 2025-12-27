# Karaoke Stage

A modern, themed karaoke player supporting CDG+MP3 and LRC formats. Built with React 19, TypeScript, and Vite. Store your karaoke collection in the browser and sing along with synchronized lyrics.

## Features

- **Multi-Format Support** - CDG (CD+Graphics) for classic karaoke, LRC for text-based lyrics
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
git clone https://github.com/yourusername/karaoke-stage.git
cd karaoke-stage

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

### Supported Formats

| Format | Description | File Types |
|--------|-------------|------------|
| **CDG** | Classic karaoke with graphics | `.mp3` + `.cdg` |
| **LRC** | Text-based lyrics (coming soon) | `.mp3` + `.lrc` |

For CDG format, both files must have the same base name (e.g., `song.mp3` and `song.cdg`).

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
karaoke-stage/
├── components/
│   ├── Atmosphere.tsx    # Falling particle effects
│   ├── KaraokeStage.tsx  # Main karaoke player
│   ├── SettingsModal.tsx # Settings UI
│   └── SongCard.tsx      # Song list item
├── formats/
│   ├── types.ts          # Renderer interfaces
│   ├── CdgRenderer.ts    # CDG format support
│   ├── LrcRenderer.ts    # LRC format support
│   └── index.ts          # Format factory
├── utils/
│   ├── categoryMatcher.ts # Keyword-based categorization
│   └── folderImport.ts    # Folder scanning logic
├── App.tsx               # Main app component
├── constants.tsx         # Theme definitions
├── types.ts              # TypeScript types
└── index.tsx             # Entry point
```

## Deployment Options

Karaoke Stage can be deployed in multiple ways:

- **Static hosting** - Build and deploy to any static host (Netlify, Vercel, GitHub Pages)
- **Docker container** - `docker run karaoke-stage` (coming soon)
- **Desktop app** - Via Electron or Tauri (coming soon)

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
