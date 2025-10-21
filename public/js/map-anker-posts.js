// Mapbox + Firestore (posts-driven) for MapAnker.html
// - Reads posts, groups by hotspotId to determine active sports
// - Looks up hotspot coords/title by id; adds markers
// - Popup: sport icons above the hotspot title

// Inject CSS for markers and popup
(function injectCSS() {
  const css = `
  .pin { width: 28px; height: 28px; border-radius: 999px; background: #ff6b6b; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
  .popup { font: 12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #111; }
  .popup h3 { margin: 6px 0 0; font-size: 14px; text-transform: uppercase; }
  .icons-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
  .sport-icon { width: 18px; height: 18px; background: center/contain no-repeat; display: inline-block; }
  .sport-icon--basketball { background-image: url('/img/icons/basketball.png'); }
  .sport-icon--soccer, .sport-icon--fodbold { background-image: url('/img/icons/soccer.png'); }
  .sport-icon--volleyball { background-image: url('/img/icons/volleyball.png'); }
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

// Utils: parse DMS string to lat/lng
function dmsToDecimal(deg, min, sec, dir) {
  let v = Number(deg) + Number(min || 0) / 60 + Number(sec || 0) / 3600;
  if (dir === "S" || dir === "W") v = -v;
  return v;
}
function parseDMSPair(s) {
  const re =
    /(\d{1,3})°\s*(\d{1,2})'?\s*(\d{1,2}(?:\.\d+)?)?"?\s*([NS])\s+(\d{1,3})°\s*(\d{1,2})'?\s*(\d{1,2}(?:\.\d+)?)?"?\s*([EW])/i;
  const m = (s || "").replace(/\s+/g, " ").trim().match(re);
  if (!m) return null;
  const lat = dmsToDecimal(m[1], m[2], m[3], m[4].toUpperCase());
  const lng = dmsToDecimal(m[5], m[6], m[7], m[8].toUpperCase());
  return { lat, lng };
}

// Map sport labels to icon class
function sportIconClass(sport) {
  const k = (sport || "").toLowerCase();
  if (k.includes("basket")) return "basketball";
  if (k === "fodbold" || k.includes("soccer") || k.includes("football"))
    return "soccer";
  if (k.includes("volley")) return "volleyball";
  return "basketball"; // fallback to a generic icon if unknown
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
function renderPopupHTML(title, sportsArr) {
  const sports = Array.isArray(sportsArr)
    ? sportsArr.map((s) => (s ?? "").toString().trim()).filter(Boolean)
    : [];
  const icons = sports
    .map(
      (s) =>
        `<span class="sport-icon sport-icon--${sportIconClass(
          s
        )}" title="${s}"></span>`
    )
    .join("");
  const iconsRow =
    icons ||
    '<span style="color:#6b7280;font-size:12px;">Ingen aktiviteter endnu</span>';
  return `<div class="popup"><div class="icons-row">${iconsRow}</div><h3>${
    title || "Hotspot"
  }</h3></div>`;
}

// Marker helper
async function addHotspotMarker(h, sports) {
  const pos = parseDMSPair(h.koordinater);
  if (!pos) {
    console.warn("Could not parse koordinater for", h);
    return;
  }
  const el = document.createElement("div");
  el.className = "pin";
  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat([pos.lng, pos.lat])
    .addTo(map);
  marker.getElement().style.cursor = "pointer";
  marker.getElement().addEventListener(
    "click",
    (ev) => {
      ev.stopPropagation();
      new mapboxgl.Popup({ offset: 12 })
        .setLngLat([pos.lng, pos.lat])
        .setHTML(renderPopupHTML(h.id, sports))
        .addTo(map);
    },
    { passive: false }
  );
}

// Main
(async function main() {
  try {
    const byHotspot = await fetchPostsGroupedByHotspot();
    for (const [hotspotId, sports] of Object.entries(byHotspot)) {
      const h = await fetchHotspotById(hotspotId);
      if (!h) {
        console.warn("No hotspot doc found for", hotspotId);
        continue;
      }
      await addHotspotMarker(h, sports);
    }
  } catch (e) {
    console.error("Failed to render posts-based hotspots", e);
  }
})();
