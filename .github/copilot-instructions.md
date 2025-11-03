## What this repo is

React + Vite SPA in `src/` with standalone Mapbox demo pages in `public/`. Two separate Firebase initializations exist: React code uses `src/assets/firebase.js`; the Mapbox demo initializes via CDN inside `public/js/map-anker-posts.clean.js`.

## Dev workflows

- Install (Node 18+): `npm install`
- Dev server: `npm run dev` (Vite)
- Build: `npm run build`; Preview: `npm run preview`; Lint: `npm run lint`
- PowerShell tip if scripts are blocked: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

## Architecture and patterns

- Routing (React Router): see `src/App.jsx`. Routes include `/`, `/login`, `/signup`, `/opretpost`, `/filtertest`, `/test`, `/testing-map`, plus a simple 404. Add pages under `src/pages/*.jsx` and register them here.
- Firebase (React app): import `db` and `auth` from `src/assets/firebase.js` (Firestore + Auth via modular SDK). Do not reuse this instance in `public/` scripts — the demo re-initializes via CDN.
- Maps (two implementations):
  - React Leaflet (`src/pages/Map.jsx`): reads hotspots once with `getDocs(collection(db, "hotspots"))`, subscribes to `posts` via `onSnapshot`, and shows a bottom sheet (`PostSildeOp`) when a marker is clicked. Coordinates are parsed from strings with `parseCoordinates` (decimal formats only).
  - Mapbox GL demo (`public/js/map-anker-posts.clean.js` wired by `public/MapAnker.html`): fully imperative, uses realtime `onSnapshot` for both `posts` and `hotspots`, parses flexible DMS/decimal strings via `parseDMSPair`, scales HTML pins by zoom, and posts messages to parent (`hotspotClick`, `backgroundTap`); also listens for `focusHotspot` from parent.
- Firestore shapes:
  - `hotspots`: `koordinater` (string; decimal or DMS), `activeplayers` (array), plus title/name fields.
  - `posts`: `hotspotId` (string), `sport` (string), `timestamp` (Firestore Timestamp).

## Integration details

- Assets: sport icons under `public/img/*-black.png` (see `sportIconUrl()`), marker styles in `public/css/map-anker.css`.
- Tokens: Mapbox token and Firebase config are committed for demos. Avoid adding new secrets; prefer env variables if you expand this.
- Styling lives in `src/Styling/*` (app) and `public/css/*` (demo).

## Do and don’t (project-specific)

- Do: import Firebase from `src/assets/firebase.js` in React; keep the CDN init in the Mapbox demo separate.
- Do: choose one map stack per change (React Leaflet or Mapbox demo) — don’t mix state or marker logic between them.
- Do: reuse `parseDMSPair` from the Mapbox script if you need DMS parsing in React (`Map.jsx` currently only handles decimals).
- Don’t: assume `mapboxgl` exists in React; it’s only global on `public/MapAnker.html`.

## Where to look first

1. `src/pages/Map.jsx` (React map + Firestore patterns) 2) `src/assets/firebase.js` (canonical Firebase exports)
2. `public/js/map-anker-posts.clean.js` + `public/MapAnker.html` (demo) 4) `package.json`/`README.md` (scripts)

If anything here is unclear or you want this file slimmer/richer (e.g., add code examples or remove demo notes), tell me what to adjust.
