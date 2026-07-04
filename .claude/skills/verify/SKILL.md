---
name: verify
description: Build, launch, and drive Karaoke Stage to verify changes end-to-end in a real browser.
---

# Verifying Karaoke Stage

React + Vite SPA, no backend. Songs live in IndexedDB; no server state to reset.

## Build & launch

```bash
npm run build                                  # production build (CSP is injected only at build time)
./node_modules/.bin/vite preview --port 4173   # serve dist/
npm run dev                                    # dev server on :3000 (no CSP — HMR needs inline scripts)
```

Verify against the **preview build** by default: the CSP meta tag only exists there.

## Drive it (Playwright + system Chrome)

Playwright with `channel: 'chrome'` uses installed Chrome — no browser download needed.
`npm install playwright` in a scratch dir, then drive `http://localhost:4173`.

Test fixtures (the app accepts any .mp3/.cdg pair):

```bash
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=5" -b:a 64k "test song.mp3"
python3 -c "open('test song.cdg','wb').write(bytes(96*300))"   # all-zero CDG = valid no-op stream
printf '[offset:+200]\n[00:00.50]First line\n[00:02.00]<00:02.00>Se<00:02.40>cond\n' > "test song.lrc"
```

LRC songs render lyrics in `p.text-4xl` (segments as spans; highlighted ones have
`opacity-100`); the card label reads `MP3+LRC Pair`.

Flows worth driving:
- Library load → "Add Song" button visible (Tailwind check: its computed border-radius should be 16px).
- Upload modal → set both `input[type=file]`, title auto-fills, "Add to Collection" → card appears **without page reload** (set `window.__marker` before, check after).
- Click card → stage → "Tap to Start Show" → clock (`span.font-mono`) advances.
- Delete card → accept the `window.confirm` dialog (register `page.on('dialog', d => d.accept())`).

## Gotchas

- External requests should be Google Fonts only; anything else (esp. cdn.tailwindcss.com) is a regression.
- `/favicon.ico` 404s — known, benign; ignore that console error.
- Mic/pitch flows need `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream` Chrome args to grant a fake mic headlessly.
- The repo lives on an exFAT volume: `._*` AppleDouble files appear everywhere; they're gitignored, ignore them.
