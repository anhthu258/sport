## Quick context

This is a small React + Vite single-page app (src/) with a few public/static map demos (public/).

- Main app: `src/` — React + react-router (see `src/App.jsx`, `src/main.jsx`).
- Map integrations:
  - React map components use Leaflet via `react-leaflet` (see `src/pages/Map.jsx`).
  - A standalone Mapbox-based map script lives in `public/js/map-anker-posts.clean.js` and is wired from `public/MapAnker.html` (Mapbox GL + Firestore via CDN).
- Firebase: Firestore + Auth are used. React app initializes Firebase in `src/assets/firebase.js`. The public map script initializes Firebase again via CDN; be careful when editing — there are two independent initializations.

## Why this structure exists

- The SPA (src/) is the primary app for routes like `/discover` and `/map`.
- The `public/` demo pages are quick standalone integrations (direct DOM + CDN SDKs) for map visualisations and legacy scripts that were kept outside React to simplify rapid prototyping.

## Build / dev / lint workflows (explicit)

- Install: `npm install` (Node 18+ recommended). See `README.md`.
- Dev server: `npm run dev` (runs `vite`).
- Build: `npm run build` (runs `vite build`).
- Preview build: `npm run preview`.
- Lint: `npm run lint` (uses ESLint configured in repo).

PowerShell note: the README mentions `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` if PowerShell blocks npm scripts.

## Coding conventions & concrete patterns to follow

- File layout: pages live in `src/pages/*.jsx`, shared components in `src/components/*.jsx`, styling in `src/Styling/*` and `public/css/*`.
- Routing: `src/App.jsx` uses `BrowserRouter` + explicit `Route` entries. Prefer adding new pages by adding a file in `src/pages/` and registering it in `App.jsx`.
- Firebase usage: prefer importing `db` / `auth` from `src/assets/firebase.js` when changing React code. Do NOT assume the public map script shares that object (it re-initializes Firebase via its own config).
- Maps:
  - React maps use `react-leaflet` (component-driven). See `src/pages/Map.jsx` for how state/markers are handled.
  - `public/js/map-anker-posts.clean.js` is imperative, Mapbox GL-based, and listens to Firestore collections `hotspots` and `posts` (realtime `onSnapshot`). If modifying map behavior, pick one integration to change — mixing patterns is error-prone.
- Firestore shape (discoverable from the scripts):
  - `hotspots` documents: expect fields like `koordinater` (string decimal or DMS), `activeplayers` (array).
  - `posts` documents: expect `hotspotId`, `sport` (string). The Mapbox script groups posts by `hotspotId` to drive marker visuals.

## Integration & assets

- Sport icons: `public/img/*-black.png` used by the Mapbox script (see `sportIconUrl()` in `public/js/map-anker-posts.clean.js`).
- Styles for Mapbox markers: `public/css/map-anker.css`.
- Mapbox token and style are embedded in `public/js/map-anker-posts.clean.js` (token visible in repo). Treat credentials carefully; migrating tokens to env vars is recommended.

## Quick examples to copy/paste

- Read Firestore `posts` (React): import `db` from `src/assets/firebase.js` and use the modular SDK helpers (`onSnapshot`, `collection`). Example pattern lives in `public/js/map-anker-posts.clean.js` — convert to React with `useEffect` + `onSnapshot` and `setState`.
- Parse hotspot coordinates: the Mapbox script contains `parseDMSPair()` — reuse or port that utility when validating `koordinater` in React code.

## Gotchas and pitfalls for AI agents

- Two Firebase initializations: editing one does not affect the other. If you change project-wide Firebase wiring, update both locations or consolidate to `src/assets/firebase.js` and refactor the demo page to import/build instead of using CDN.
- Map implementations are duplicated (Leaflet vs Mapbox). Don't assume markers/state are shared across them.
- Some public/demo pages expect globals (e.g., `mapboxgl` loaded via script tag). If you remove/convert them, update the corresponding HTML in `public/`.
- The code contains hard-coded tokens/keys in repo files. Do not commit new secret material — prefer env variables and document where to place them.

## Where to look first when changing features

1. `src/pages/Map.jsx` — React map behavior.
2. `src/assets/firebase.js` — canonical Firebase exports for the React app.
3. `public/js/map-anker-posts.clean.js` + `public/MapAnker.html` — standalone Mapbox demo and the Firestore realtime patterns.
4. `package.json`, `vite.config.js`, `README.md` — dev/build/lint commands.

## If you need more access

- Ask for the preferred Map provider (Mapbox vs Leaflet) and whether public/demo pages should be migrated into React.
- Request a developer account for any private APIs or production Firebase keys if you need to run integration tests.

If any section is unclear or you want the file tailored (shorter, more examples, or to remove the public/demo notes), tell me what to expand or remove.
