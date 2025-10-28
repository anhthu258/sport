/*
===============================================================================
MapAnker – Posts-driven Mapbox markers with Firestore (formatted)
-------------------------------------------------------------------------------
Responsibilities
- Load all hotspots and render a pin for each (empty hotspots show as grey)
- Read posts in realtime and show current sports per hotspot
- Read hotspots in realtime and recolor pins green when activeplayers > 0
- Pointy pins that scale by zoom; show single-sport icon inside the pin

Notes
- Marker anchor is set to `bottom` so the geographic coordinate aligns to the
  tip of the pin (classic map behaviour).
- Pin sizing changes by width/height (no CSS transforms) to avoid drift.
===============================================================================
*/

// Styles for markers live in /public/css/map-anker.css

// Firebase (module CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ----------------------------------------------------------------------------
// Firebase config + init
// ----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCX1TDi4tAkdsCs_KjZRhFKoDl9XCKPz2k",
  authDomain: "sport-13624.firebaseapp.com",
  projectId: "sport-13624",
  storageBucket: "sport-13624.firebasestorage.app",
  messagingSenderId: "351245073345",
  appId: "1:351245073345:web:9a1961d00092ae3bd94d40",
  measurementId: "G-EW7Q2JZJ85",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase initialized, db:", db);

// ----------------------------------------------------------------------------
// Map init
// ----------------------------------------------------------------------------
mapboxgl.accessToken =
  "pk.eyJ1IjoiYW5rZXJkZXJiYW5rZXIiLCJhIjoiY204c2Y0MWR5MDN5bjJrczllNTE3MnhhaiJ9.7fSArYI9db041IbQE8iXgA";
const aarhusCenter = [10.2072, 56.154];
const aarhusMaxBounds = [
  [10.05, 56.08],
  [10.35, 56.25],
];
// START CONFIG: change these to adjust the initial camera position/zoom.
// - `START_CENTER` is [lng, lat]
// - `START_ZOOM` is a numeric zoom level (larger -> closer)
// Example: set `START_CENTER = [10.22, 56.16]` and `START_ZOOM = 14.5`.
const START_CENTER = aarhusCenter; // default starting center (replace as needed)
const START_ZOOM = 12.7; // default starting zoom (replace as needed)

// Tight bounds around the start center (edit the deltas to tighten/loosen)
// Values are in degrees (roughly ~111km per degree lat; lon depends on latitude)
const BOUNDS_DELTA_LNG = 0.03; // smaller number => tighter east/west bounds
const BOUNDS_DELTA_LAT = 0.03; // smaller number => tighter north/south bounds
const START_BOUNDS = [
  [START_CENTER[0] - BOUNDS_DELTA_LNG, START_CENTER[1] - BOUNDS_DELTA_LAT],
  [START_CENTER[0] + BOUNDS_DELTA_LNG, START_CENTER[1] + BOUNDS_DELTA_LAT],
];
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/ankerderbanker/cmgt7si7h000e01qucza3f2mo",
  center: START_CENTER,
  // Start more zoomed in so map focuses on city-level hotspots immediately
  zoom: START_ZOOM,
  // Allow users to zoom out beyond the initial zoom level if they want
  minZoom: 12.2,
  maxZoom: 18,
  // Use the tighter bounds derived from the start center
  maxBounds: START_BOUNDS,
  attributionControl: false, // hide attribution + compact info button
});
console.log("Map initialized:", map);
// Remove default zoom/compass UI; we keep our own Reset control
map.scrollZoom.enable();
map.on("style.load", () => {
  console.log("Map style loaded");
  map.setFog({});
});

// --- Reset View control (top-left) ---
class ResetViewControl {
  onAdd(mapInstance) {
    this._map = mapInstance;
    const container = document.createElement("div");
    container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = "Reset view";
    btn.setAttribute("aria-label", "Reset view");
    btn.innerHTML = "\u21BA"; // simple rotate arrow symbol
    btn.style.fontSize = "16px";
    btn.style.lineHeight = "24px";
    btn.style.width = "48px";
    btn.style.height = "48px";
    btn.addEventListener("click", () => {
      // Restore to the exact start camera
      map.easeTo({
        center: START_CENTER,
        zoom: START_ZOOM,
        pitch: 0,
        bearing: 0,
        duration: 500,
        easing: (t) => t,
        essential: true,
      });
    });

    container.appendChild(btn);
    return container;
  }
  onRemove() {
    this._map = undefined;
  }
}
map.addControl(new ResetViewControl(), "top-left");

// Reset tilt when the user reaches the maximum zoom-out (minZoom).
// Use 'zoomend' so we act after the gesture finishes, avoiding conflicts.
map.on("zoomend", () => {
  const minZ = map.getMinZoom();
  const z = map.getZoom();
  if (z <= minZ + 0.001) {
    const p = map.getPitch();
    if (Math.abs(p) > 0.01) {
      map.easeTo({ pitch: 0, duration: 300, easing: (t) => t });
    }
  }
});

// Listen for focus requests from parent page (Discover slider)
window.addEventListener("message", (e) => {
  try {
    const isSameOrigin = e.origin === window.location.origin;
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const isDevOk =
      isLocal &&
      (e.origin.includes("localhost") || e.origin.includes("127.0.0.1"));
    if (!isSameOrigin && !isDevOk) return;
    const d = e.data || {};
    if (!d || d.type !== "focusHotspot") return;

    const q = (d.hotspotId || d.query || "").toString().trim().toLowerCase();
    if (!q) return;

    // Find hotspot by id or common title fields
    let target = null;
    if (_hotspots.has(q)) target = _hotspots.get(q);
    if (!target) {
      for (const h of _hotspots.values()) {
        const candidates = [h.id, h.title, h.name, h.navn, h.placeName]
          .map((v) => (v || "").toString().trim().toLowerCase())
          .filter(Boolean);
        if (candidates.includes(q)) {
          target = h;
          break;
        }
      }
    }
    if (!target) return;

    const pos = parseDMSPair(target.koordinater);
    if (!pos) return;

    const current = map.getZoom();
    const MIN_ZOOM_DELTA = 0.6;
    const focusZoom = Math.min(
      map.getMaxZoom(),
      Math.max(FOCUS_Z, current + MIN_ZOOM_DELTA)
    );
    const focusBearing = normalizeBearing(
      map.getBearing() + FOCUS_BEARING_DELTA
    );

    map.flyTo({
      center: [pos.lng, pos.lat],
      zoom: focusZoom,
      pitch: FOCUS_PITCH,
      bearing: focusBearing,
      speed: 0.9,
      curve: 1.6,
      essential: true,
    });
  } catch {
    // ignore
  }
});

// Notify parent (React app) when the user clicks the bare map background.
// Marker clicks are handled on their own DOM elements and call stopPropagation,
// so they won't trigger this handler. This lets the parent show a UI affordance
// (like a reveal handle) only on true background taps.
map.on("click", () => {
  try {
    const msg = { source: "map-anker", type: "backgroundTap" };
    if (window.parent && window.parent !== window) {
      // Same-origin in Vite dev/preview, safe to use current origin
      window.parent.postMessage(msg, window.location.origin);
    }
  } catch (e) {
    // no-op
  }
});

// ----------------------------------------------------------------------------
// Zoom-based sizing for HTML markers (adjust element size, not CSS transform)
// ----------------------------------------------------------------------------
const _pinNodes = []; // track <div class="pin"> nodes for resize on zoom
const _markers = new Map(); // hotspotId -> { marker, pin }
let _pendingRAF = 0;

// Focus behavior constants (tweak feel here)
const FOCUS_Z = 16.0; // target zoom when focusing a pin
const FOCUS_PITCH = 40; // tilt on focus
const FOCUS_BEARING_DELTA = 10; // rotate relative to current bearing on focus

function normalizeBearing(b) {
  // Normalize to [-180, 180)
  let a = ((((b + 180) % 360) + 360) % 360) - 180;
  return a;
}

function _computeScale(z) {
  // Slightly larger pins: ~1.1 at z10 up to ~2.7 at z18 (clamped)
  const s = 1.1 + Math.max(0, z - 10) * 0.2; // slope ~0.2 per zoom step
  return Math.max(1.1, Math.min(2.7, s));
}

function _applyScale() {
  _pendingRAF = 0;
  const z = map.getZoom();
  const s = _computeScale(z);
  const base = 28; // px
  const d = Math.round(base * s);
  for (const pin of _pinNodes) {
    pin.style.width = `${d}px`;
    pin.style.height = `${d}px`;
    pin.style.setProperty("--pin-size", `${d}px`); // scale tip triangles
  }
}

function _scheduleScale() {
  if (_pendingRAF) return;
  _pendingRAF = requestAnimationFrame(_applyScale);
}
map.on("zoom", _scheduleScale);

// ----------------------------------------------------------------------------
// Coordinate parsing utilities
// ----------------------------------------------------------------------------
/**
 * Convert Degrees/Minutes/Seconds + hemisphere into a decimal coordinate.
 * @param {string|number} deg
 * @param {string|number} min
 * @param {string|number} sec
 * @param {"N"|"S"|"E"|"W"} dir
 * @returns {number}
 */
function dmsToDecimal(deg, min, sec, dir) {
  let v = Number(deg) + Number(min || 0) / 60 + Number(sec || 0) / 3600;
  if (dir === "S" || dir === "W") v = -v;
  return v;
}

/**
 * Parse a coordinate string into {lat, lng}.
 * Accepts both decimal pairs (e.g. "56.1629, 10.2039") and flexible DMS
 * strings with varied separators and typographic quotes.
 * @param {string} s
 * @returns {{lat:number, lng:number}|null}
 */
function parseDMSPair(s) {
  const raw = (s || "").toString().trim();
  if (!raw) return null;

  // 1) Try simple decimal: "56.1629, 10.2039"
  const dec = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (dec) {
    const lat = parseFloat(dec[1]);
    const lng = parseFloat(dec[2]);
    if (isFinite(lat) && isFinite(lng)) return { lat, lng };
  }

  // 2) Normalize typographic quotes and degree marks
  const norm = raw
    .replace(/[‘’′`´]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/º/g, "°")
    .replace(/\s+/g, " ")
    .trim();

  // 3a) Two-pass DMS parsing: LAT then LNG separately (tolerant separators)
  const reLat = /(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([NS])/i;
  const reLng = /(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([EW])/i;
  const mLat = norm.match(reLat);
  if (mLat) {
    const rem = norm.slice(mLat.index + mLat[0].length);
    const mLng = rem.match(reLng);
    if (mLng) {
      const lat = dmsToDecimal(
        mLat[1],
        mLat[2],
        mLat[3],
        mLat[4].toUpperCase()
      );
      const lng = dmsToDecimal(
        mLng[1],
        mLng[2],
        mLng[3],
        mLng[4].toUpperCase()
      );
      return { lat, lng };
    }
  }

  // 3b) Single-pass fallback (both in one go)
  const reBoth =
    /(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([NS])\D+(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([EW])/i;
  const mBoth = norm.match(reBoth);
  if (mBoth) {
    const lat = dmsToDecimal(
      mBoth[1],
      mBoth[2],
      mBoth[3],
      mBoth[4].toUpperCase()
    );
    const lng = dmsToDecimal(
      mBoth[5],
      mBoth[6],
      mBoth[7],
      mBoth[8].toUpperCase()
    );
    return { lat, lng };
  }
  return null;
}

// ----------------------------------------------------------------------------
// Sport icon mapping
// ----------------------------------------------------------------------------
/**
 * Normalize a sport label to an icon key that matches available PNG assets.
 * Known: basketball, fodbold (soccer/football), volley (volleyball), tennis
 * @param {string} sport
 * @returns {"basketball"|"fodbold"|"volley"|"tennis"}
 */
function sportKey(sport) {
  const k = (sport || "").toLowerCase();
  if (k.includes("basket")) return "basketball";
  if (k === "fodbold" || k.includes("soccer") || k.includes("football"))
    return "fodbold"; // file present: fodbold-black.png
  if (k.includes("volley")) return "volley"; // file present: volley-black.png
  if (k.includes("tennis")) return "tennis"; // file present: tennis-black.png
  return "basketball"; // fallback
}

/**
 * Build the URL for a black sport icon inside the pin.
 * @param {string} sport
 */
function sportIconUrl(sport) {
  return `/img/${sportKey(sport)}-black.png`;
}

// ----------------------------------------------------------------------------
// Data fetchers
// ----------------------------------------------------------------------------
/**
 * Read a single hotspot by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function fetchHotspotById(id) {
  try {
    const ref = doc(db, "hotspots", id);
    const s = await getDoc(ref);
    if (!s.exists()) return null;
    return { id: s.id, ...s.data() };
  } catch (e) {
    console.warn("Failed to get hotspot", id, e);
    return null;
  }
}

// Helper (unused here, kept for reference)
async function fetchPostsGroupedByHotspot() {
  const snap = await getDocs(collection(db, "posts"));
  const byHotspot = new Map();
  for (const d of snap.docs) {
    const data = d.data() || {};
    const hid = (data.hotspotId ?? "").toString().trim();
    if (!hid) continue;
    const sport = (data.sport ?? "").toString().trim();
    if (!byHotspot.has(hid)) byHotspot.set(hid, new Set());
    if (sport) byHotspot.get(hid).add(sport);
  }
  return Object.fromEntries(
    [...byHotspot.entries()].map(([hid, set]) => [hid, [...set]])
  );
}

// ----------------------------------------------------------------------------
// Marker helpers
// ----------------------------------------------------------------------------
/**
 * Remove an existing marker and de-register its DOM pin from scaling.
 * @param {string} hid Hotspot id
 */
function removeMarker(hid) {
  const meta = _markers.get(hid);
  if (!meta) return;
  meta.marker.remove();
  if (meta.pin) {
    const i = _pinNodes.indexOf(meta.pin);
    if (i >= 0) _pinNodes.splice(i, 1);
  }
  _markers.delete(hid);
}

/**
 * Create and add a marker for a hotspot.
 * - Grey pin when there are no posts
 * - Red pin when posts exist but activeplayers is empty
 * - Green pin when posts exist and activeplayers > 0
 * - If exactly one sport is present, render its white icon inside the pin
 * @param {object} h Hotspot document (must include koordinater)
 * @param {string[]} sports Unique sports for this hotspot from posts
 */
async function addHotspotMarker(h, sports) {
  console.log(
    "Adding marker for hotspot:",
    h.id,
    "with koordinater:",
    h.koordinater
  );
  const pos = parseDMSPair(h.koordinater);
  if (!pos) {
    console.warn("Could not parse koordinater for", h);
    return;
  }
  console.log("Parsed coordinates:", pos);

  // Build a marker element
  const root = document.createElement("div");
  root.className = "marker";
  const scaleWrap = document.createElement("div");
  scaleWrap.className = "marker-scale";
  const pin = document.createElement("div");

  const uniqueSports = Array.isArray(sports) ? sports.filter(Boolean) : [];
  const hasPosts = uniqueSports.length > 0;
  const hasActivePlayers =
    Array.isArray(h.activeplayers) && h.activeplayers.length > 0;

  if (!hasPosts) {
    pin.className = "pin pin--empty";
  } else if (hasActivePlayers) {
    pin.className = "pin pin--active";
  } else {
    pin.className = "pin"; // default red
  }

  // Single sport -> show icon inside
  if (uniqueSports.length === 1) {
    const img = document.createElement("img");
    img.className = "pin-icon";
    img.alt = uniqueSports[0];
    img.title = uniqueSports[0];
    img.src = sportIconUrl(uniqueSports[0]);
    pin.appendChild(img);
  }

  scaleWrap.appendChild(pin);
  root.appendChild(scaleWrap);

  const marker = new mapboxgl.Marker({ element: root, anchor: "bottom" })
    .setLngLat([pos.lng, pos.lat])
    .addTo(map);

  console.log("Marker added to map for hotspot:", h.id, "at position:", [
    pos.lng,
    pos.lat,
  ]);

  // Track for zoom-based size updates
  _pinNodes.push(pin);
  _markers.set(h.id, { marker, pin });
  _scheduleScale();

  // Click: gracefully fly/zoom to this pin
  const el = marker.getElement();
  el.style.cursor = "pointer";
  el.addEventListener(
    "click",
    (ev) => {
      console.log("Pin clicked for hotspot:", h.id);
      ev.stopPropagation();
      const current = map.getZoom();
      // Always zoom in at least a bit to create a clear focus motion
      const MIN_ZOOM_DELTA = 0.6;
      const focusZoom = Math.min(
        map.getMaxZoom(),
        Math.max(FOCUS_Z, current + MIN_ZOOM_DELTA)
      );

      // No early return: always perform a small focus fly when clicking a pin

      // Build focus view for this click and move camera (no persistent state)
      const currentBearing = map.getBearing();
      const focusPitch = FOCUS_PITCH;
      const focusBearing = normalizeBearing(
        currentBearing + FOCUS_BEARING_DELTA
      );

      map.flyTo({
        center: [pos.lng, pos.lat],
        zoom: focusZoom,
        pitch: focusPitch,
        bearing: focusBearing,
        speed: 0.9, // lower is slower, smoother
        curve: 1.6,
        essential: true,
      });

      // Notify parent React app about the clicked hotspot so UI can update
      try {
        const title = h.title || h.name || h.navn || h.placeName || h.id;
        const msg = {
          source: "map-anker",
          type: "hotspotClick",
          hotspotId: h.id,
          title,
        };
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(msg, window.location.origin);
        }
      } catch (e) {
        console.error("Error sending message:", e);
      }
    },
    { passive: true }
  );
  // No popup/title for now as requested
}

/**
 * Update an existing marker's visual class based on current sports and
 * activeplayers, without recreating the DOM.
 * @param {string} hid Hotspot id
 */
function updateMarkerVisual(hid) {
  const meta = _markers.get(hid);
  const h = _hotspots.get(hid);
  if (!meta || !h) return;
  const sig = _currentSportsSig.get(hid) || "";
  const hasPosts = sig.length > 0;
  const hasActivePlayers =
    Array.isArray(h.activeplayers) && h.activeplayers.length > 0;
  meta.pin.classList.remove("pin--empty", "pin--active");
  if (!hasPosts) meta.pin.classList.add("pin--empty");
  else if (hasActivePlayers) meta.pin.classList.add("pin--active");
}

// ----------------------------------------------------------------------------
// In-memory state
// ----------------------------------------------------------------------------
/** @type {Map<string, any>} */
const _hotspots = new Map(); // id -> hotspot doc
/** @type {Map<string, string>} */
const _currentSportsSig = new Map(); // id -> signature string

/**
 * Create a normalized signature string for a list of sports.
 * Ensures we only re-render markers when the sports set changes.
 * @param {string[]} arr
 * @returns {string}
 */
function sportsSignature(arr) {
  const norm = (Array.isArray(arr) ? arr : [])
    .map((s) => (s || "").toString().trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return norm.join(",");
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
(async function main() {
  try {
    console.log("Starting map initialization...");
    // 1) Load all hotspots and render as empty initially (grey pins)
    const allHotspotsSnap = await getDocs(collection(db, "hotspots"));
    console.log("Loaded hotspots:", allHotspotsSnap.docs.length);
    allHotspotsSnap.forEach((d) => {
      const h = { id: d.id, ...(d.data() || {}) };
      _hotspots.set(h.id, h);
      console.log("Hotspot:", h.id, h.title || h.name || h.navn || h.placeName);
    });
    for (const h of _hotspots.values()) {
      const sig = ""; // empty
      _currentSportsSig.set(h.id, sig);
      await addHotspotMarker(h, []);
      console.log("Added marker for hotspot:", h.id);
    }

    // 2) Realtime: listen to posts and update markers for all hotspots
    onSnapshot(collection(db, "posts"), async (snap) => {
      const byHotspot = new Map();
      snap.forEach((d) => {
        const data = d.data() || {};
        const hid = (data.hotspotId ?? "").toString().trim();
        if (!hid) return;
        const sport = (data.sport ?? "").toString().trim();
        if (!byHotspot.has(hid)) byHotspot.set(hid, new Set());
        if (sport) byHotspot.get(hid).add(sport);
      });

      // Upsert or keep markers for every hotspot (empty when no posts)
      for (const [hid, h] of _hotspots.entries()) {
        const sports = byHotspot.has(hid) ? [...byHotspot.get(hid)] : [];
        const sig = sportsSignature(sports);
        if (_currentSportsSig.get(hid) === sig) continue; // no change
        _currentSportsSig.set(hid, sig);
        removeMarker(hid);
        await addHotspotMarker(h, sports);
      }
    });

    // 3) Realtime: listen to hotspots for activeplayers changes and recolor pins
    onSnapshot(collection(db, "hotspots"), (snap) => {
      snap.docChanges().forEach((change) => {
        const d = change.doc;
        const h = { id: d.id, ...(d.data() || {}) };
        _hotspots.set(h.id, h);
        updateMarkerVisual(h.id);
      });
    });
  } catch (e) {
    console.error("Failed to render posts-based hotspots", e);
  }
})();
