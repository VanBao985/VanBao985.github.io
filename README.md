# College Memories — vanbao985.github.io

A photo-memory site for student life, built as a React + Vite single-page app
and hosted on GitHub Pages.

## Architecture

There is no dedicated server. The whole system is two layers:

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React 18 + Vite + react-router | Single-page app: public gallery and admin panel |
| **Backend / Storage** | GitHub Contents API | Stores photos and metadata inside the repo itself |

The admin route writes data by **committing directly through GitHub's REST API**,
using a Personal Access Token (PAT) you paste into the browser. Each push to
`main` triggers the GitHub Actions workflow, which rebuilds and redeploys the
site in 1–2 minutes.

**Why not Supabase/Firebase?** Their free tiers pause idle projects and rate-limit
traffic. GitHub Pages serves static files over a CDN with no cold starts —
plenty for a collection of ~100 photos.

## Routes

Routing happens on the client — there is only one HTML file.

| Route | Screen |
|---|---|
| `/dashboard` | Public gallery — the main entry point |
| `/login` | Paste your PAT to sign in |
| `/admin` | Upload and manage photos (requires a valid token) |
| `/` and anything else | 404 screen |

The site root `/` is deliberately **not** a route — the gallery lives at
`/dashboard`, and the bare domain shows the 404 screen.

### How deep links survive GitHub Pages

GitHub Pages serves static files and knows nothing about client-side routes, so
requesting `/admin` directly would normally 404. The build copies
`dist/index.html` to `dist/404.html`; Pages serves that file for unknown paths,
the app boots, and react-router renders the right screen from the URL. This
keeps URLs clean (`/admin`, not `/#/admin`).

## Project structure

```
├── index.html                  # The only HTML entry (React mounts at #root)
├── vite.config.js              # Build config + the 404.html SPA fallback plugin
├── .github/workflows/deploy.yml# Build + deploy to GitHub Pages
├── public/                     # Copied verbatim into dist/
│   ├── .nojekyll               # Disable Jekyll on Pages
│   ├── data/memories.json      # "Database" — metadata for all photos
│   └── images/                 # Uploaded photos
└── src/
    ├── main.jsx                # React bootstrap (BrowserRouter + AuthProvider)
    ├── App.jsx                 # Route table
    ├── pages/                  # Gallery, Login, Admin
    ├── components/             # Layout, Header, Footer, RequireAuth,
    │                           # Achievements, StatCounter, Hero, Toolbar,
    │                           # Gallery, Lightbox
    ├── context/AuthContext.jsx # Reactive wrapper around the stored token
    ├── data/achievements.js    # Config for the animated achievements band
    ├── lib/github.js           # Storage adapter — GitHub Contents API
    ├── lib/images.js           # Compression, slugify, byte formatting
    ├── lib/assets.js           # Resolves public/ asset URLs
    └── styles/main.css         # Design tokens + all styling
```

## Local development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve dist/ locally on :4173
```

## `public/data/memories.json` schema

```jsonc
{
  "albums": [
    { "id": "graduation", "name": "Graduation", "order": 5 }
  ],
  "photos": [
    {
      "id": "uuid",
      "src": "images/2024-06-15-graduation-day-a1b2c3.jpg", // URL path
      "title": "Graduation Day",
      "description": "…",
      "date": "2024-06-15",
      "album": "graduation",
      "location": "Campus courtyard",
      "people": ["Bao", "Minh"],
      "width": 2000,
      "height": 1333,
      "uploadedAt": "2024-06-16T10:00:00.000Z"
    }
  ]
}
```

`width`/`height` are stored so the gallery can set `aspect-ratio` up front and
avoid layout shift (CLS) while images load.

Note: `src` is a **URL path** — the file itself lives at `public/images/...` in
the repo. The admin panel maps between the two with `repoPath()` in
`src/lib/github.js`, and the gallery resolves it for display with `assetUrl()`
in `src/lib/assets.js`.

## Achievements band

The animated stats at the top of the gallery are configured in
`src/data/achievements.js`. Each entry: `{ value, decimals, unit, label, note }`.
Numbers count up from 0 on page load (skipped under `prefers-reduced-motion`).

## Security

- The repo is **public** (required for free GitHub Pages) but **contains no tokens**.
- The PAT lives only in the `localStorage` of the browser you use.
- Use a **fine-grained PAT** limited to this repo with only `Contents: Read and write`.
- Visitors need no token and cannot write anything.
- If you suspect the token leaked: GitHub → Settings → Developer settings → revoke it and create a new one.

## Image compression tuning

Edit the `COMPRESS` constant in `src/lib/images.js`:

```js
const COMPRESS = {
  maxDimension: 2000,     // longest edge (px)
  quality: 0.82,          // JPEG quality 0–1
  skipUnder: 300 * 1024,  // files under this size are kept as-is
};
```

## Platform limits

| Item | Limit |
|---|---|
| Repo size | 1 GB (recommended) |
| Bandwidth | 100 GB/month |
| GitHub API | 5,000 requests/hour |

Each uploaded photo is one commit and each push triggers a deploy, so avoid
uploading very large batches in rapid succession.

## Deployment

Push to `main` — the `deploy.yml` workflow builds the site and publishes
`dist/` to GitHub Pages. The repo's Pages source must be set to
**GitHub Actions** (Settings → Pages → Source).
