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

// ----------------------------------------------------------------------------
// Map init
// ----------------------------------------------------------------------------
mapboxgl.accessToken =
  "pk.eyJ1IjoiYW5rZXJkZXJiYW5rZXIiLCJhIjoiY204c2Y0MWR5MDN5bjJrczllNTE3MnhhaiJ9.7fSArYI9db041IbQE8iXgA";
const aarhusCenter = [10.2039, 56.1629];
const aarhusMaxBounds = [
  [10.05, 56.08],
  [10.35, 56.25],
];
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/ankerderbanker/cmgt7si7h000e01qucza3f2mo",
  center: aarhusCenter,
  zoom: 11,
  minZoom: 10,
  maxZoom: 18,
  maxBounds: aarhusMaxBounds,
});
map.addControl(new mapboxgl.NavigationControl());
map.scrollZoom.enable();
map.on("style.load", () => map.setFog({}));

// ----------------------------------------------------------------------------
// Zoom-based sizing for HTML markers (adjust element size, not CSS transform)
// ----------------------------------------------------------------------------
const _pinNodes = []; // track <div class="pin"> nodes for resize on zoom
const _markers = new Map(); // hotspotId -> { marker, pin }
let _pendingRAF = 0;

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
    return "fodbold"; // file present: fodbold-white.png
  if (k.includes("volley")) return "volley"; // file present: volley-white.png
  if (k.includes("tennis")) return "tennis"; // file present: tennis-white.png
  return "basketball"; // fallback
}

/**
 * Build the URL for a white sport icon inside the pin.
 * @param {string} sport
 */
function sportIconUrl(sport) {
  return `/img/${sportKey(sport)}-white.png`;
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
  const pos = parseDMSPair(h.koordinater);
  if (!pos) {
    console.warn("Could not parse koordinater for", h);
    return;
  }

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
      ev.stopPropagation();
      const TARGET_ZOOM = 16.5; // set point for focusing a pin
      const current = map.getZoom();
      const shouldZoom = current < TARGET_ZOOM - 0.05; // only zoom if below target
      const finalZoom = shouldZoom ? TARGET_ZOOM : current; // never zoom further

      // If we're already essentially centered on this pin and zoomed enough, do nothing
      const center = map.getCenter();
      const cPx = map.project([center.lng, center.lat]);
      const pPx = map.project([pos.lng, pos.lat]);
      const distPx = Math.hypot(pPx.x - cPx.x, pPx.y - cPx.y);
      if (!shouldZoom && distPx < 24) return;

      map.flyTo({
        center: [pos.lng, pos.lat],
        zoom: finalZoom,
        speed: 0.9, // lower is slower, smoother
        curve: 1.6,
        essential: true,
      });
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
    // 1) Load all hotspots and render as empty initially (grey pins)
    const allHotspotsSnap = await getDocs(collection(db, "hotspots"));
    allHotspotsSnap.forEach((d) => {
      const h = { id: d.id, ...(d.data() || {}) };
      _hotspots.set(h.id, h);
    });
    for (const h of _hotspots.values()) {
      const sig = ""; // empty
      _currentSportsSig.set(h.id, sig);
      await addHotspotMarker(h, []);
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
