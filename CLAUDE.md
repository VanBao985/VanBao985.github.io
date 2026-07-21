# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A photo-memory site ("College Memories") hosted on GitHub Pages. It is a **single-page React 18 + Vite app** with client-side routing (react-router v6) — the public gallery *and* the authenticated admin panel are routes in the same app. All UI text, code comments, and commit messages are in **English**.

## Commands

```bash
npm install       # once
npm run dev       # Vite dev server on :5173
npm run build     # production build into dist/
npm run preview   # serve the built dist/ locally on :4173
```

There is no lint or test tooling.

## Architecture

The site is serverless. GitHub itself is the backend — the repo *is* the database and CDN.

There is exactly **one HTML entry** (`index.html` → `src/main.jsx` → `src/App.jsx`). Routes are resolved on the client, not by file paths:

| Route | Component | Notes |
|---|---|---|
| `/dashboard` | `src/pages/Gallery.jsx` | public; filtering, search, lightbox state lives here |
| `/login` | `src/pages/Login.jsx` | PAT entry; redirects to `/admin` when already signed in |
| `/admin` | `src/pages/Admin.jsx` | protected by `src/components/RequireAuth.jsx` |
| `*` | `src/pages/NotFound.jsx` | catch-all 404 screen |

**`/` is intentionally not a route.** The gallery lives at `/dashboard`, so the
bare root falls through to the catch-all and renders the 404 screen. When
adding links, point at `/dashboard` — never `/`, and never make the catch-all
redirect to `/` (that would loop forever against itself).

- **Layout** (`src/components/Layout.jsx`): renders `Header` / `<Outlet/>` / `Footer` around every route.
- **Achievements** (`src/components/Achievements.jsx` + `StatCounter.jsx`): animated count-up stats band at the top of the gallery. Data is configured in `src/data/achievements.js` — add entries there, no component changes needed.
- **Auth** (`src/context/AuthContext.jsx`): reactive mirror of the token in `localStorage` so the UI re-renders on sign in/out. `github.js` remains the source of truth for requests.
- **Admin** (`src/pages/Admin.jsx`): authenticated write UI. The user pastes a GitHub fine-grained PAT (stored only in `localStorage`, never committed). Uploads/deletes are performed as **direct commits via the GitHub Contents REST API**.
- **Storage adapter** (`src/lib/github.js`): the *only* module that talks to GitHub. Everything reads/writes through `getFile` / `putFile` / `deleteFile` / `loadDatabase` / `saveDatabase`. To swap backends, reimplement this module's interface.
- **Image helpers** (`src/lib/images.js`): `compress` / `slugify` / `formatBytes`, kept framework-agnostic.

`public/data/memories.json` is the single source of truth: `{ albums: [...], photos: [...] }`. Schema is documented in `README.md`. Photos are sorted by `date` descending; `width`/`height` are stored per-photo so the gallery can set `aspect-ratio` up front and avoid layout shift (CLS).

### URL path vs repo path

Served files live under `public/` in the repo but are deployed at the site root. Photo `src` values in `memories.json` are **URL paths** (`images/...`); when the admin panel talks to the GitHub API it maps them to repo paths with `repoPath()` from `github.js` (`public/images/...`). Preserve this split when touching upload/delete code.

## Key mechanics to preserve

- **SPA fallback**: GitHub Pages has no rewrite rule, so a deep link like `/admin` would 404. The `spaFallback` plugin in `vite.config.js` copies `dist/index.html` → `dist/404.html` at build time; Pages serves that on unknown paths and the router takes over. Do not remove it, and do not hand-write `public/404.html` — it must carry the hashed asset names Vite injects.
- **Asset paths**: use `assetUrl()` from `src/lib/assets.js` for anything fetched from `public/` (data JSON, photo `src`). Bare relative paths break on nested routes.
- **UTF-8 base64**: the Contents API is base64, and browser `btoa` only handles Latin-1. Non-ASCII text goes through `utf8ToBase64` / `base64ToUtf8` in `github.js` — do not replace these with raw `btoa`/`atob`.
- **Optimistic concurrency**: writes must send the file's current `sha`; a stale sha returns 409/422. `saveDatabase` re-reads and retries once on conflict. Preserve this when touching write paths.
- **Upload flow** (`src/pages/Admin.jsx`): each image is compressed on-canvas, then committed as its own commit; `memories.json` is committed **once** at the end. Each commit triggers a Pages deploy, so avoid changing this into one-commit-per-field or bulk rapid commits.
- **Cache-busting**: the gallery fetches `memories.json?t=<timestamp>` with `cache: 'no-store'` so freshly uploaded photos appear without waiting on GitHub Pages' long `Cache-Control`.
- **XSS**: React escapes rendered text by default — never introduce `dangerouslySetInnerHTML` for user data. (The old vanilla `esc()` helper is gone along with the vanilla admin; it is no longer needed.)
- **Object URLs**: queued upload previews use `URL.createObjectURL`; they are revoked on removal, on clear, and on unmount. Keep that cleanup when editing the queue.
- Image compression is tuned via the `COMPRESS` constant in `src/lib/images.js` (`maxDimension`, `quality`, `skipUnder`).
- `public/.nojekyll` is copied into `dist/` by Vite; keep it so Pages serves files verbatim.

## Deployment

Push to `main`. `.github/workflows/deploy.yml` builds with Vite and deploys `dist/` via `actions/deploy-pages`. The repo's Pages source must be set to **GitHub Actions** (Settings → Pages). Admin uploads commit straight to `main`, which re-triggers the workflow (~1–2 min until photos appear).
