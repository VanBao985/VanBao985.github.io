# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static photo-memory site ("Kí ức đại học") hosted on GitHub Pages. There is **no build step, no framework, no package manager, and no test suite** — just HTML, CSS, and vanilla JS ES Modules served as-is. The UI language is Vietnamese; keep user-facing strings in Vietnamese and code comments in the existing (accent-free) Vietnamese style.

## Running locally

ES Modules are blocked over `file://`, so you must serve over HTTP:

```bash
python -m http.server 8000   # then open http://localhost:8000
```

There is nothing to build, lint, or test via tooling.

## Architecture

The site is serverless. GitHub itself is the backend — the repo *is* the database and CDN.

- **Public gallery** (`index.html` + `app.js`): fetches `data/memories.json` directly from the deployed site (no token, anonymous). Renders cards + lightbox client-side.
- **Admin** (`admin.html` + `admin.js`): authenticated write UI. The user pastes a GitHub fine-grained PAT (stored only in `localStorage`, never committed). Uploads/deletes are performed as **direct commits via the GitHub Contents REST API**. GitHub Pages rebuilds ~1–2 min later.
- **Storage adapter** (`github.js`): the *only* module that talks to GitHub. Everything reads/writes through `getFile` / `putFile` / `deleteFile` / `loadDatabase` / `saveDatabase`. To swap backends (Supabase, Cloudinary, …), reimplement this module's interface and re-point the import in `admin.js` — nothing else should need to change.

`data/memories.json` is the single source of truth: `{ albums: [...], photos: [...] }`. Its schema is documented in `README.md`. `app.js` sorts photos by `date` descending; `width`/`height` are stored per-photo so the gallery can set `aspect-ratio` up front and avoid layout shift (CLS).

## Key mechanics to preserve

- **UTF-8 base64**: the Contents API is base64, and browser `btoa` only handles Latin-1. Vietnamese text goes through `utf8ToBase64` / `base64ToUtf8` in `github.js` — do not replace these with raw `btoa`/`atob`.
- **Optimistic concurrency**: writes must send the file's current `sha`; a stale sha returns 409/422. `saveDatabase` re-reads and retries once on conflict. Preserve this when touching write paths.
- **Upload flow** (`admin.js`): each image is compressed on-canvas, then committed as its own commit; `memories.json` is committed **once** at the end. Because GitHub Pages caps at ~10 builds/hour and each commit triggers a build, avoid changing this into one-commit-per-field or bulk rapid commits.
- **Cache-busting**: `app.js` fetches `memories.json?t=<timestamp>` with `cache: 'no-store'` so freshly uploaded photos appear without waiting on GitHub Pages' long `Cache-Control`.
- **XSS**: all user data rendered into HTML goes through the `esc()` helper (present in both `app.js` and `admin.js`). Keep using it for any new interpolated field.
- Image compression is tuned via the `COMPRESS` constant at the top of `admin.js` (`maxDimension`, `quality`, `skipUnder`).

## Deployment

Push to `main`. GitHub Pages serves the repo root; `.nojekyll` disables Jekyll so files are served verbatim. No CI/CD config beyond that.
