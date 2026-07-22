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

| Route | Component | Access | Notes |
|---|---|---|---|
| `/gallery` | `src/pages/Gallery.jsx` | public | folder filter + carousel state lives here |
| `/invite` | `src/pages/Invite.jsx` | **public** | a guest's card; the name arrives as `?to=` |
| `/invite-maker` | `src/pages/InviteMaker.jsx` | **admin** | wrapped in `RequireAuth` |
| `/login` | `src/pages/Login.jsx` | public | GitHub PAT entry |
| `*` | `src/pages/NotFound.jsx` | public | catch-all 404 |

**`/` is intentionally not a route.** The gallery lives at `/gallery`, so the bare root falls through to the catch-all. Never point the catch-all at `/` — it would redirect to itself forever.

**`/invite` must stay public.** Guests have no account; gating it would break every link that has been handed out.

- **Layout** (`src/components/Layout.jsx`): `Header` / `<Outlet/>` / `Footer` around every route.
- **Achievements** (`src/components/Achievements.jsx` + `StatCounter.jsx`): animated count-up band. Configure in `src/data/achievements.js` — no component changes needed.
- **Carousel** (`src/components/PhotoCarousel.jsx`): the photo viewer — prev/next buttons, arrow keys, neighbour preloading, thumbnail strip.
- **Hero** (`src/components/Hero.jsx`): total photo count plus the folder filter chips (chips only render when more than one folder is configured).
- **Theme toggle** (`src/components/ThemeToggle.jsx`): light/dark switch in the header.
- **Visit counter** (`src/components/VisitorCounter.jsx`): total visits, bottom-right of the footer.

## Invitations

The design is an **image** in `public/invite/`; code only draws the guest's name on top of it. Anything code could draw would be a poor imitation of a real exported design, so the split is deliberate: `src/data/invitation.js` says which template to use and where the name goes, and `src/lib/invitationCard.js` composites the two.

Swapping in a new design means replacing the image, updating `width`/`height` to its real pixel size, and nudging `guestName.x` / `.y`. PNG and SVG both work.

- **Guest names live in the URL** (`/invite?to=Minh`), not in any store. That is what lets a personalised link work on a static host with no backend, and why handing out a new invitation needs no rebuild.
- The name is **untrusted input** from that URL. `cleanName()` caps it at 32 characters. React escapes it in the DOM and canvas `fillText` cannot execute it, but never route it into `dangerouslySetInnerHTML`.
- **Size the whole line, not just the name.** `measureLine()` includes the `prefix` ("Thân mời:") and the gap; measuring the name alone let long names run off the edge of the label.
- The template is loaded **once per page load** and must stay **same-origin** — a cross-origin image would taint the canvas and make `toBlob()` (the download) throw.
- `drawInvitation()` awaits `document.fonts.ready`. Drawing earlier silently falls back to system fonts with no error to explain why the name looks wrong.
- SVG templates are rendered in isolation and **cannot see the page's Google Fonts**, so any text baked into an SVG must use a system font that has real Vietnamese glyphs. Georgia does not — it renders "Lễ tốt nghiệp" with the accents detached.

## Authentication

Sign-in exists only to gate the invitation maker. `src/lib/auth.js` asks GitHub `/user` who the token belongs to and requires it to be `REPO.owner`.

It checks **identity, not permission**, on purpose. The obvious alternative — "can this token read the repo?" — is worthless here because the repo is *public*, so every token passes. Checking the owner gives a real gate while needing no repository permissions at all, which keeps the token harmless if it ever leaks.

Be clear-eyed about what this does *not* buy: nothing secret sits behind the gate, and a determined visitor could rebuild the card generator from the public bundle. It keeps the tab out of the way; it is not protecting data.

## Theming

Three states, in priority order: an explicit choice on `<html data-theme>` wins, otherwise the system preference applies.

- The dark palette is written **twice** in `main.css` — once under `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }` and once under `:root[data-theme='dark']`. CSS cannot share a declaration block between two selectors, so **keep the two copies in sync** when changing colours.
- `index.html` carries a small inline script that applies the saved theme **before first paint**. Without it the page renders in the system theme and visibly flips when React mounts. Do not move this into React.
- Only an explicit click is persisted to `localStorage`. While nothing is stored the component keeps following the OS setting live via a `matchMedia` listener.

## Visit counter

The count lives on **counterapi.dev** (free, keyless) because a static site has nowhere to keep a running total. Consequences a future change should not forget:

- Every page view hits a **third party**; the endpoint is public, so anyone reading the bundle could inflate the number. Treat it as decoration, not analytics.
- Counted **once per browser session** (`sessionStorage`), and guarded by a ref because StrictMode runs effects twice in development.
- If the service is unreachable the component renders **nothing** — never a broken placeholder. Keep that failure mode.

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

- **SPA fallback**: GitHub Pages has no rewrite rule, so a deep link like `/gallery` would 404. The `spaFallback` plugin in `vite.config.js` copies `dist/index.html` → `dist/404.html` at build time. Do not remove it, and do not hand-write `public/404.html` — it must carry the hashed asset names Vite injects.
- **HTTP status is inverted**: `/gallery` is served via `404.html` so it returns a 404 status with correct content, while `/` returns 200 with the not-found screen. This is inherent to static Pages hosting, not a bug.
- **Asset paths**: use `assetUrl()` from `src/lib/assets.js` for anything under `public/`. Bare relative paths break on nested routes.
- **Carousel reset**: `Gallery.jsx` passes `key={activeFolder}` to `PhotoCarousel` so switching folders remounts it and resets to photo 1. Without this, the index could point past the end of a smaller folder.
- **Cache-busting**: the gallery fetches `drive-photos.json?t=<timestamp>` with `cache: 'no-store'` so a fresh deploy shows new photos without waiting on GitHub Pages' long `Cache-Control`.
- **XSS**: React escapes rendered text by default — never introduce `dangerouslySetInnerHTML` for Drive-supplied file names.
- `public/.nojekyll` is copied into `dist/` by Vite; keep it so Pages serves files verbatim.

## Deployment

Push to `main`. `.github/workflows/deploy.yml` runs `npm ci` + `npm run build` (which syncs Drive first) and deploys `dist/` via `actions/deploy-pages`. The repo's Pages source must be set to **GitHub Actions** (Settings → Pages). The live gallery is at `/gallery`, not the bare domain.
