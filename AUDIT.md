# Karaoke Stage — Full Code Audit

Date: 2026-10-31 · Scope: web app (React/Vite), Tauri desktop, Docker image,
landing page, GitHub workflows. Baseline at audit start: `npm run typecheck`
clean, `npm test` 44/44 passing, `npm run build` clean. HEAD `2f7791d`.

Severity: **High** = broken/misleading core behaviour or real exposure ·
**Medium** = wrong results, data divergence, or missing wiring ·
**Low** = dead code, polish, defence-in-depth.

---

## High

### H1. Latest GitHub Pages deploy failed — live site is a stale build
Run `28701807806` (push of current `main`) failed at `actions/deploy-pages`
with "Deployment failed, try again later" (GitHub-side transient) and was
never retried. https://karaokestage.retroverse.studio/ serves an earlier
build. Fix: re-run the workflow after fixes land; no code change needed.

### H2. Production dependency audit: 4 high-severity advisories
`npm audit --omit=dev` reports high-severity issues in `vite`, `nanoid`,
`postcss`, `source-map-js` — reachable in "production" only because
`@tailwindcss/vite` and `tailwindcss` (build-time tooling) are declared in
`dependencies` in `package.json`. Fix: move build tooling to
`devDependencies`, run `npm audit fix`, re-verify build/tests.

## Medium

### M1. Scoring is octave-blind (product decision needed)
`calculatePitchMatch`/`getPitchDirection` (`utils/pitchDetection.ts`) use the
absolute semitone distance. Singing the correct note one octave lower/higher
than the guide (routine when a male singer follows a female-led track) scores
0% and reports "Flat". A test currently asserts this ("scores an octave apart
as zero", `utils/pitchDetection.test.ts:88`). Most karaoke scoring accepts
octave equivalence. Fix if accepted: fold the semitone difference into
[-6, 6) before scoring; update the test.

### M2. Reference "pitch" is the autocorrelation of the whole mix
`usePitchDetection` runs `detectPitch` on the backing MP3's full mix. The
dominant periodicity is usually bass/drums, not the melody, so the score
compares the singer against whatever periodic component wins. There is no
cheap correct fix client-side (would need melody extraction or note charts);
document as a known limitation in README/landing copy, which currently
implies accurate scoring ("real-time singing score").

### M3. `backingVolume` setting is dead
`settings.backingVolume` (default 80) is persisted but has no UI control and
is never applied to the `<audio>` element — `KaraokeStage` even receives
`settings` as a prop and never reads it. Fix: add a volume slider in
Settings → General and apply `audio.volume = backingVolume / 100` in the
stage (initial + on change).

### M4. Deleting a custom category orphans songs and the active theme
`SettingsModal.handleDeleteCustomCategory` only removes the category from
settings. Songs keep the deleted id in `themeIds` (badge silently skipped,
card falls back to the active theme's colours), and if the deleted category
was the active theme, `settings.themeId` keeps pointing at the orphan
(UI falls back to `classic` visuals but no pill is highlighted and uploads
default into the ghost category via `handleBulkImport`). Fix: on delete,
strip the id from every song (fall back to `christmas` if it was the only
category) and reset `themeId` to `classic` if it pointed at the deleted id.

### M5. No duplicate detection on import
Re-importing the same folder (or song) creates a second copy of every track
with a fresh id — the natural "did it work? run it again" flow doubles the
library and its IndexedDB footprint. Fix if accepted: skip (and count as
skipped) when a song with the same title (case-insensitive) already exists
during bulk/folder import.

### M6. Optimistic library updates never roll back or surface failures
`deleteSong`, `renameSong`, `changeSongCategories` in `hooks/useSongLibrary.ts`
update UI state first and only `console.error` when IndexedDB persistence
fails. A failed delete looks successful until reload (song reappears); a
failed rename silently reverts on reload. Fix: roll back the optimistic
update (reload from storage) and surface an error to the user.

### M7. Unvalidated settings deserialization can white-screen the app
`loadSettings` (`hooks/useSettings.ts`) spreads `JSON.parse` output over the
defaults without shape checks. Corrupt/hand-edited localStorage (e.g.
`customCategories` not an array) throws inside `useMemo` during `App` render
— outside any `ErrorBoundary` — leaving a blank page. Fix: validate field
types on load and fall back per-field to defaults.

### M8. Tauri desktop ships with CSP disabled
`src-tauri/tauri.conf.json` sets `"csp": null` while the web build injects a
strict CSP (`vite.config.ts`). The desktop webview therefore has no CSP at
all (and loads remote Google Fonts). Fix: set a Tauri CSP mirroring the web
policy. (The app uses no Tauri JS APIs, so no IPC allowances are required;
`NSMicrophoneUsageDescription` is correctly present in `Info.plist`.)

### M9. `getAllSongs` deserializes every song's binary payload to list titles
`IndexedDBStorage.getAllSongs` uses `store.getAll()`, pulling every MP3 blob
handle and every CDG `Uint8Array` into memory just to map metadata. With a
large ripped-disc library this is slow and memory-heavy on startup. Proper
fix is a schema split (metadata store + blob store, DB v2 migration);
recorded here as an architecture item, not a quick patch.

### M10. Folder import imports AppleDouble junk and truncates silently
`utils/folderImport.ts` pairs any `*.mp3`/`*.cdg` basename — including macOS
AppleDouble sidecars (`._Song.mp3` + `._Song.cdg`) that exFAT drives are
full of, producing junk songs titled `._Song`. Recursion also stops at
depth 5 with no notice, so deeper libraries import partially. Fix: skip
`._*` (and dotfiles), and surface the depth limit in the import result.

## Low

### L1. Dead code / unwired API surface
- `UploadModal.onSongAdded` — declared, destructured, passed a no-op from
  `App.tsx`, never invoked (all uploads go through `onBulkImport`).
- `useSongLibrary.getFilteredSongs` — returned but unused; `App.tsx`
  duplicates the filter inline.
- `usePitchDetection.disconnectReferenceAudio` — never called.
- `formats.isTextFormat`, `formats.RendererFactory`, `types.PerformanceStats`,
  `utils.getCategoryMatchSummary` — exported, zero references.
- `matchCategoriesWithDefault` — referenced only by its own test.
- `Song.difficulty` / `Song.description` — hardcoded `'Medium'` /
  `'Custom Track'` at import, stored, never displayed anywhere.
- `StoredSong.duration` — always saved as `0`, never back-filled from the
  audio element's metadata; the stage reads duration from the element.
- `Atmosphere.tsx` redefines `ParticleType` instead of importing from
  `types.ts` (two sources of truth for the same union).
- `songs/` directory contains only `.gitkeep` (leftover; library lives in
  IndexedDB).
- `KaraokeStage`'s `settings` prop is unread (becomes used if M3 is fixed).

### L2. Repeated-timestamp LRC lines reuse the first occurrence's word timings
In `LrcRenderer.parse`, word timings are parsed once against
`timestamps[0]` and cloned for every repeated-timestamp entry, so enhanced
word highlighting on a repeated chorus line fires at the first chorus's
times (i.e. not at all). Fix: rebase word times per entry by
`time - timestamps[0]`.

### L3. Category auto-matching uses raw substrings
`categoryMatcher` matches `'love'` inside "Glove Story", `'abc'` inside any
title containing those letters, etc. Word-boundary matching would cut false
positives. Cosmetic (suggestions only) — fix opportunistically.

### L4. `enableMic` race on rapid toggling
Toggling the mic while `getUserMedia` is in flight can start a second
stream/analysis loop and leak the first stream (button state is the only
guard). Fix: in-flight ref guard.

### L5. Privacy copy vs Google Fonts
Landing and in-app copy stress "never leaves your device" (true for songs
and mic audio), but both the app and landing load fonts from
`fonts.googleapis.com`/`fonts.gstatic.com`, and the landing calls the GitHub
releases API. Self-hosting the two fonts would make the claim airtight.

### L6. Accessibility / motion
- Stage play/pause is a click-only `<div>` (no keyboard activation), unlike
  the seek bar and song cards which handle keys.
- Modals don't trap focus (Escape-to-close works).
- `Atmosphere` particles ignore `prefers-reduced-motion`.

### L7. Folder-import progress semantics
`ImportProgress.scanned` is set equal to `found` during scanning and to
`pairs.length` during import — it never means "files scanned". Cosmetic;
rename or populate honestly.

### L8. Upload validation is extension-only
Single-song upload trusts `.mp3`/`.cdg`/`.lrc` extensions; a mislabelled
file is stored and fails later with a generic "Error loading media file."
No size guard on multi-hundred-MB files either. Acceptable for a local tool;
a clearer error would help.

---

## Verified good (checked, no action)
- No `dangerouslySetInnerHTML`; titles/lyrics render as React text (no XSS
  sink from song metadata or LRC content).
- Web CSP is strict and build-injected (`vite.config.ts`); favicon and asset
  paths resolve correctly under the Pages subpath (checked `dist/index.html`).
- CDG seek-backwards is handled by `cdgraphics` (`isRestarting` path).
- Blob-URL lifecycle: revoked on song clear/delete (`useSongLibrary`).
- Mic/audio lifecycle: context closed and refs nulled on unmount
  (StrictMode-safe); reference audio connects only after a user gesture.
- Scoring only counts frames where both singer and reference have a detected
  pitch (instrumental breaks don't penalize).
- Docker image serves the app only (no landing), multi-arch CI, healthcheck
  present; `docker-compose.yml` documents the secure-context caveat.
- Legacy migrations are deliberate and contained: `mm_settings_v7` settings
  key, `MerryMelodiesDB_v1` DB name, `cdgData`/`themeId` read-side fallbacks
  with write-side cleanup on update.
- Live site and `/app/` return 200 (stale build — see H1); v1.0.0 desktop
  release exists with assets; Docker CI green.

## Suggested fix order
H2 (deps) → M3 (wire volume) → M4 (category delete) → M6 (rollback) →
M7 (settings validation) → M8 (Tauri CSP) → M10 (AppleDouble/depth) →
M1/M5 (if approved) → L1–L8 sweep → re-run Pages workflow (H1).
M2 and M9 are document/defer items.
---

## Resolution (2026-11-01)

Fixed in this pass (user approved: everything incl. Low; octave equivalence;
skip duplicate titles):

- **H2** Build tooling (`tailwindcss`, `@tailwindcss/vite`) moved to
  `devDependencies`; `npm audit fix` → 0 vulnerabilities (prod and full).
- **M1** Scoring folds semitone distance modulo the octave
  (`octaveFoldedSemitoneDiff`); tests updated.
- **M3** Backing-track volume slider added (Settings → General) and applied
  to the stage audio element.
- **M4** Deleting a custom category now strips it from all songs
  (fallback `christmas`) and resets the active theme to All Songs.
- **M5** Imports skip songs whose title already exists (case-insensitive);
  folder import counts them as skipped.
- **M6** Failed optimistic updates resync the library from IndexedDB and
  tell the user instead of failing silently.
- **M7** Settings are validated field-by-field on load.
- **M8** Tauri CSP set to mirror the web policy (verified with `cargo check`).
- **M10** Folder scan skips `._*`/hidden files, reports real scanned counts
  (**L7**), and warns when the 5-level depth limit truncates the scan.
- **L1** Removed: `onSongAdded` prop, `getFilteredSongs`,
  `disconnectReferenceAudio`, `isTextFormat`, `RendererFactory`,
  `PerformanceStats`, `getCategoryMatchSummary`, `matchCategoriesWithDefault`
  (+ its test), `difficulty`/`description` fields (types, storage, import),
  duplicate `ParticleType` in Atmosphere, and the empty `songs/` directory.
- **L2** Enhanced-LRC word times rebased per repeated-timestamp entry.
- **L3** Category keywords match on word boundaries (+ tests).
- **L4** `enableMic` guarded against in-flight double invocation.
- **L5** Fonts self-hosted (app `assets/fonts/`, landing `landing/fonts/`);
  Google Fonts links and CSP font allowances removed.
- **L6** Stage surface is keyboard-activatable; modals take initial focus;
  Atmosphere honors `prefers-reduced-motion`.
- **L8** Playback error message now names the likely cause and remedy.

Documented/deferred:

- **M2** Party-score accuracy note added to README (Singing Score section).
- **M9** Metadata/blob store split remains an architecture item for a future
  DB v2 migration; not attempted in this pass.
- **H1** Pages redeploy happens via the push carrying these fixes.

Verification: `npm run typecheck` clean · `npm test` 46/46 ·
`npm run build` clean (fonts bundled as hashed assets) ·
`cargo check` clean for the Tauri shell (target dir moved off exFAT to
avoid AppleDouble corruption of Tauri's generated permission files).
