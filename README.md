# Karaoke Stage

A modern, themed karaoke player supporting CDG+MP3 and LRC formats. Built with React 19, TypeScript, and Vite. Store your karaoke collection in the browser and sing along with synchronized lyrics.

**Try it now:** https://retroverse-studios.github.io/karaoke-stage/ — landing page with the web app, desktop downloads, and self-hosting instructions.

## Features

- **Multi-Format Support** - CDG (CD+Graphics) for classic karaoke, LRC for text-based lyrics (including enhanced LRC word timing)
- **Singing Score** - Optional microphone pitch detection compares your singing to the backing track in real time, with a live pitch meter, streak confetti, and an end-of-song score
- **Themed Categories** - Organize songs by occasion: Christmas, Easter, Birthday, Halloween, Romance, Kids, Neon Party, and more
- **Custom Categories** - Create your own categories with custom names, emojis, colors, and particle effects
- **Bulk Import** - Import entire folders of karaoke files with automatic MP3+CDG/LRC pair detection
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
# From a clone of this repository
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

### Checks

```bash
npm run typecheck   # TypeScript (strict mode)
npm test            # unit tests (vitest)
```

## Usage

### Adding Songs

1. Click **"Add Song"** button
2. **Folder Import** (Chrome/Edge): Click "Select Folder" to import multiple songs at once
3. **Single Upload**: Select an MP3 and a CDG or LRC file, enter a title, and choose categories

### Supported Formats

| Format | Description | File Types |
|--------|-------------|------------|
| **CDG** | Classic karaoke with graphics | `.mp3` + `.cdg` |
| **LRC** | Text-based lyrics (basic and enhanced word timing) | `.mp3` + `.lrc` |

Both files must have the same base name (e.g., `song.mp3` and `song.cdg`). When a folder contains both a `.cdg` and an `.lrc` for the same song, CDG wins.

### Singing Score

Click **"Enable Mic"** in the player to turn on pitch detection. The app compares your pitch to the backing track (autocorrelation-based detection), shows a live meter, and presents a score summary when the song ends. Microphone audio never leaves the browser.

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
- **TypeScript** (strict) - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling (compiled at build time via `@tailwindcss/vite`)
- **Vitest** - Unit tests
- **IndexedDB** - Client-side storage for songs
- **Web Audio API** - Microphone capture and pitch detection
- **cdgraphics** - CDG file parsing and rendering
- **File System Access API** - Folder import (Chrome/Edge)

## Project Structure

```
karaoke-stage/
├── components/
│   ├── Atmosphere.tsx     # Falling particle effects + confetti bursts
│   ├── ErrorBoundary.tsx  # Crash containment for library/player
│   ├── KaraokeStage.tsx   # Main karaoke player
│   ├── PitchMeter.tsx     # Live pitch match meter
│   ├── SettingsModal.tsx  # Settings UI
│   ├── SingingSummary.tsx # End-of-song score modal
│   ├── SongCard.tsx       # Song list item
│   └── UploadModal.tsx    # Single upload + folder import UI
├── formats/
│   ├── types.ts           # Renderer interfaces
│   ├── CdgRenderer.ts     # CDG format support
│   ├── LrcRenderer.ts     # LRC format support (+ tests)
│   └── index.ts           # Format factory / detection
├── hooks/
│   ├── usePitchDetection.ts # Mic capture, pitch analysis, scoring
│   ├── useSettings.ts       # Persistent user settings
│   └── useSongLibrary.ts    # Song CRUD over the storage service
├── services/
│   ├── storage.ts           # StorageService interface (swappable for Electron/Tauri)
│   └── IndexedDBStorage.ts  # IndexedDB implementation
├── utils/
│   ├── categoryMatcher.ts # Keyword-based categorization (+ tests)
│   ├── folderImport.ts    # Folder scanning logic
│   └── pitchDetection.ts  # Autocorrelation pitch detection (+ tests)
├── App.tsx                # Main app component
├── constants.tsx          # Theme definitions
├── types.ts               # TypeScript types
└── index.tsx              # Entry point
```

## Ways to Run It

### Web (GitHub Pages)

Pushed to `main`, the site auto-deploys via `.github/workflows/pages.yml`: the landing
page (`landing/`) is served at the site root and the app at `/app/`.

### Docker (self-hosted party box)

```bash
curl -O https://raw.githubusercontent.com/retroverse-studios/karaoke-stage/main/docker-compose.yml
docker compose up -d
# open http://localhost:8080
```

Images are published to `ghcr.io/retroverse-studios/karaoke-stage` (amd64 + arm64) by
`.github/workflows/docker.yml`. Note: microphone scoring and folder import need a secure
context — they work on `localhost`, but LAN devices over plain HTTP get playback only.
Front it with an HTTPS reverse proxy (Caddy, Traefik) to enable them everywhere.

### Desktop (Tauri)

Installers for macOS (Apple Silicon + Intel), Windows, and Linux are built by
`.github/workflows/release.yml` when a `v*` tag is pushed, and land on GitHub Releases.
The landing page's download button picks the right one automatically.

Local development:

```bash
npm run desktop:dev     # dev app in a native window
npm run desktop:build   # build installers locally (requires Rust)
```

On an exFAT/external volume, set `CARGO_TARGET_DIR` to an internal disk first — macOS
`._*` metadata files inside `target/` break the build (the `desktop:*` scripts clean the
source tree automatically).

Known desktop caveats: on macOS the WebView is WebKit, so folder import
(`showDirectoryPicker`) is unavailable — use single-song upload; Windows (WebView2) has
full feature parity with Chrome.

## Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Core playback | Yes | Yes | Yes | Yes |
| Folder import | Yes | Yes | No | No |
| Singing score (mic) | Yes | Yes | Yes | Yes |

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [cdgraphics](https://www.npmjs.com/package/cdgraphics) - CDG parsing library
- CDG format specification for karaoke graphics
