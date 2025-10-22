// Mapbox + Firestore (posts-driven) for MapAnker.html
// - Reads posts, groups by hotspotId to determine active sports
// - Looks up hotspot coords/title by id; adds markers
// - Popup: sport icons above the hotspot title

// Inject CSS for markers and popup
(function injectCSS() {
  const css = `
  .marker { position: relative; display: flex; align-items: center; justify-content: center; }
  .marker-scale { display:flex; align-items:center; justify-content:center; transform-origin: center center; will-change: transform; }
  .pin { width: 28px; height: 28px; border-radius: 999px; background: #ff6b6b; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.25); display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .pin-icon { width: 16px; height: 16px; object-fit: contain; display: block; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

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

// Config
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

// Map init
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

// Zoom-based scaling for HTML markers
const _markerScaleNodes = [];
const _markers = new Map(); // hotspotId -> { marker, scaleWrap }
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
  for (const n of _markerScaleNodes) n.style.transform = `scale(${s})`;
}
function _scheduleScale() {
  if (_pendingRAF) return;
  _pendingRAF = requestAnimationFrame(_applyScale);
}
map.on("zoom", _scheduleScale);

// Utils: parse DMS string to lat/lng
function dmsToDecimal(deg, min, sec, dir) {
  let v = Number(deg) + Number(min || 0) / 60 + Number(sec || 0) / 3600;
  if (dir === "S" || dir === "W") v = -v;
  return v;
}
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
  // 3a) Two-pass DMS parsing: find LAT then LNG separately with tolerant separators
  const reLat = /(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([NS])/i;
  const reLng = /(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([EW])/i;
  const mLat = norm.match(reLat);
  if (mLat) {
    // Remove matched lat portion and search for lng in the remainder to avoid cross-matching
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

// Map sport labels to PNG icon filenames in /img/icons
function sportKey(sport) {
  const k = (sport || "").toLowerCase();
  if (k.includes("basket")) return "basketball";
  if (k === "fodbold" || k.includes("soccer") || k.includes("football"))
    return "soccer";
  if (k.includes("volley")) return "volleyball";
  return "basketball"; // fallback
}
function sportIconUrl(sport) {
  return `/img/${sportKey(sport)}-white.png`;
}

// Data fetchers
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

// Popup renderer
function renderPopupHTML(title) {
  return `<div class="popup"><h3>${title || "Hotspot"}</h3></div>`;
}

// Marker helper
function removeMarker(hid) {
  const meta = _markers.get(hid);
  if (!meta) return;
  meta.marker.remove();
  const i = _markerScaleNodes.indexOf(meta.scaleWrap);
  if (i >= 0) _markerScaleNodes.splice(i, 1);
  _markers.delete(hid);
}

async function addHotspotMarker(h, sports) {
  const pos = parseDMSPair(h.koordinater);
  if (!pos) {
    console.warn("Could not parse koordinater for", h);
    return;
  }
  // Build a marker element; if exactly one sport exists, show its white icon inside the pin
  const root = document.createElement("div");
  root.className = "marker";
  const scaleWrap = document.createElement("div");
  scaleWrap.className = "marker-scale";
  const pin = document.createElement("div");
  pin.className = "pin";
  const uniqueSports = Array.isArray(sports) ? sports.filter(Boolean) : [];
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
  const marker = new mapboxgl.Marker({ element: root })
    .setLngLat([pos.lng, pos.lat])
    .addTo(map);
  // Track scale wrapper for zoom-scaling
  _markerScaleNodes.push(scaleWrap);
  _markers.set(h.id, { marker, scaleWrap });
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

// Main
(async function main() {
  try {
    // Realtime: listen to posts and update markers
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

      // Remove markers that no longer have posts
      for (const hid of Array.from(_markers.keys())) {
        if (!byHotspot.has(hid)) removeMarker(hid);
      }

      // Upsert markers for current hotspots
      for (const [hotspotId, sportSet] of byHotspot.entries()) {
        const sports = [...sportSet];
        const h = await fetchHotspotById(hotspotId);
        if (!h) {
          console.warn("No hotspot doc found for", hotspotId);
          continue;
        }
        // Recreate marker each time for simplicity
        removeMarker(h.id);
        await addHotspotMarker(h, sports);
      }
    });
  } catch (e) {
    console.error("Failed to render posts-based hotspots", e);
  }
})();
