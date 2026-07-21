# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A photo-gallery site ("College Memories") hosted on GitHub Pages. It is a **single-page React 18 + Vite app** with client-side routing (react-router v6). Photos are **not stored in this repo** — they live in public Google Drive folders and are listed into a static JSON file at build time. All UI text, code comments, and commit messages are in **English**.

## Commands

```bash
npm install        # once
npm run dev        # Vite dev server on :5173
npm run sync:drive # refresh public/data/drive-photos.json from Drive
npm run build      # sync:drive, then production build into dist/
npm run preview    # serve the built dist/ locally on :4173
```

There is no lint or test tooling.

## Architecture

There is exactly **one HTML entry** (`index.html` → `src/main.jsx` → `src/App.jsx`). Routes resolve on the client:

| Route | Component | Notes |
|---|---|---|
| `/dashboard` | `src/pages/Gallery.jsx` | the gallery — folder filter + carousel state lives here |
| `*` | `src/pages/NotFound.jsx` | **currently commented out in `App.jsx`** (see below) |

**`/` is intentionally not a route.** The gallery lives at `/dashboard`. Note the catch-all is presently commented out, so `/` and unknown paths render a *blank page* rather than the 404 screen; uncommenting the one line in `App.jsx` restores it. Never point the catch-all at `/` — it would redirect to itself forever.

- **Layout** (`src/components/Layout.jsx`): `Header` / `<Outlet/>` / `Footer` around every route.
- **Achievements** (`src/components/Achievements.jsx` + `StatCounter.jsx`): animated count-up band. Configure in `src/data/achievements.js` — no component changes needed.
- **Carousel** (`src/components/PhotoCarousel.jsx`): the photo viewer — prev/next buttons, arrow keys, neighbour preloading, thumbnail strip.
- **Hero** (`src/components/Hero.jsx`): total photo count plus the folder filter chips (chips only render when more than one folder is configured).

## Google Drive as the photo source

`src/data/drive-folders.js` is the config: a list of `{ id, name }` for public Drive folders. Adding a folder there is the *only* step needed to add a section to the gallery.

`scripts/fetch-drive-photos.mjs` runs at build time and writes `public/data/drive-photos.json` as `{ syncedAt, folders: [{ id, name, photos: [{ id, name }] }] }`. The gallery fetches that JSON — visitors never talk to Google.

Things to preserve:

- **Why build-time and not client-side**: Google's `embeddedfolderview` endpoint sends **no CORS header**, so a browser `fetch` of it is blocked. Node has no such restriction. Do not try to move this listing into the React app.
- **Image URLs**: `https://drive.google.com/thumbnail?id=<id>&sz=w<width>` via `driveImageUrl()` in `src/lib/drive.js`. The `lh3.googleusercontent.com/d/<id>` form was tested against these folders and **fails** — do not "simplify" to it.
- **Both Drive endpoints are undocumented.** They work today and can break without notice; that is the first thing to check if photos vanish.
- **Folders must stay shared as "Anyone with the link"**, or images 404 for visitors.
- **Subfolders are ignored** by the sync script on purpose. To include one, list it explicitly in `drive-folders.js`.
- New photos in Drive **do not appear until a rebuild** — the listing is frozen at build time. Re-run the deploy workflow to refresh.
- Drive gives us only file names, no dates/albums/descriptions. Any richer metadata needs a separate mapping file.

## Other mechanics to preserve

- **SPA fallback**: GitHub Pages has no rewrite rule, so a deep link like `/dashboard` would 404. The `spaFallback` plugin in `vite.config.js` copies `dist/index.html` → `dist/404.html` at build time. Do not remove it, and do not hand-write `public/404.html` — it must carry the hashed asset names Vite injects.
- **HTTP status is inverted**: `/dashboard` is served via `404.html` so it returns a 404 status with correct content, while `/` returns 200 with the not-found screen. This is inherent to static Pages hosting, not a bug.
- **Asset paths**: use `assetUrl()` from `src/lib/assets.js` for anything under `public/`. Bare relative paths break on nested routes.
- **Carousel reset**: `Gallery.jsx` passes `key={activeFolder}` to `PhotoCarousel` so switching folders remounts it and resets to photo 1. Without this, the index could point past the end of a smaller folder.
- **Cache-busting**: the gallery fetches `drive-photos.json?t=<timestamp>` with `cache: 'no-store'` so a fresh deploy shows new photos without waiting on GitHub Pages' long `Cache-Control`.
- **XSS**: React escapes rendered text by default — never introduce `dangerouslySetInnerHTML` for Drive-supplied file names.
- `public/.nojekyll` is copied into `dist/` by Vite; keep it so Pages serves files verbatim.

## Deployment

Push to `main`. `.github/workflows/deploy.yml` runs `npm ci` + `npm run build` (which syncs Drive first) and deploys `dist/` via `actions/deploy-pages`. The repo's Pages source must be set to **GitHub Actions** (Settings → Pages). The live gallery is at `/dashboard`, not the bare domain.
