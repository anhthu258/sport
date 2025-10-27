import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import PostSildeOp from "../components/PostSildeOp";
import { db } from "../assets/firebase";
import { collection, getDocs, onSnapshot } from "firebase/firestore";

export default function Map({ embedded = false }) {
  const navigate = useNavigate();

  // State for hotspots and posts
  const [hotspots, setHotspots] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (embedded) return;
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") navigate("/discover");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate, embedded]);

  // Load hotspots from Firestore
  useEffect(() => {
    const loadHotspots = async () => {
      try {
        const hotspotsSnapshot = await getDocs(collection(db, "hotspots"));
        const hotspotsData = hotspotsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHotspots(hotspotsData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading hotspots:", error);
        setLoading(false);
      }
    };
    loadHotspots();
  }, []);

  // Load posts from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "posts"), (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      }));
      setPosts(postsData);
    });
    return () => unsubscribe();
  }, []);

  // Map page only: keyboard back to Discover. Swipe is handled by Discover when embedded.

  const center = [56.1629, 10.2039]; // [lat, lng] Aarhus

  // Parse coordinates from hotspot data
  const parseCoordinates = (koordinater) => {
    if (!koordinater) return null;

    // Try to parse as decimal coordinates first (lat, lng)
    const decimalMatch = koordinater.match(
      /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/
    );
    if (decimalMatch) {
      const lat = parseFloat(decimalMatch[1]);
      const lng = parseFloat(decimalMatch[2]);
      if (isFinite(lat) && isFinite(lng)) {
        return [lat, lng];
      }
    }

    // Try to parse as lng, lat format
    const reverseMatch = koordinater.match(
      /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/
    );
    if (reverseMatch) {
      const lng = parseFloat(reverseMatch[1]);
      const lat = parseFloat(reverseMatch[2]);
      if (isFinite(lat) && isFinite(lng)) {
        return [lat, lng];
      }
    }

    // Try to parse as space-separated coordinates
    const spaceMatch = koordinater.match(
      /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/
    );
    if (spaceMatch) {
      const lat = parseFloat(spaceMatch[1]);
      const lng = parseFloat(spaceMatch[2]);
      if (isFinite(lat) && isFinite(lng)) {
        return [lat, lng];
      }
    }

    console.warn("Could not parse coordinates:", koordinater);
    return null;
  };

  // Handle pin click
  const handlePinClick = (hotspot) => {
    setSelectedHotspot(hotspot);
    setSheetOpen(true);
  };

  // Filter posts for selected hotspot
  const filteredPosts = selectedHotspot
    ? posts.filter((post) => post.hotspotId === selectedHotspot.id)
    : [];

  const containerStyle = embedded
    ? { height: "100%", width: "100%" }
    : { height: "100dvh", width: "100%" };

  return (
    <div style={containerStyle}>
      {!embedded && (
        <button
          onClick={() => navigate("/discover")}
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 1000,
            background: "#111827cc",
            color: "#fff",
            border: "1px solid #1f2937",
            borderRadius: 8,
            padding: "8px 12px",
          }}
          aria-label="Back to Discover"
        >
          ← Back
        </button>
      )}

      {/* Close button for PostSildeOp when it's open */}
      {sheetOpen && (
        <button
          onClick={() => setSheetOpen(false)}
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 1000,
            background: "#111827cc",
            color: "#fff",
            border: "1px solid #1f2937",
            borderRadius: 8,
            padding: "8px 12px",
          }}
          aria-label="Luk opslag"
        >
          ✕ Luk
        </button>
      )}
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render markers for each hotspot */}
        {hotspots.map((hotspot) => {
          const coordinates = parseCoordinates(hotspot.koordinater);
          if (!coordinates) return null;

          return (
            <Marker
              key={hotspot.id}
              position={coordinates}
              eventHandlers={{
                click: () => handlePinClick(hotspot),
              }}
            >
              <Popup>
                <div>
                  <h3>
                    {hotspot.title ||
                      hotspot.name ||
                      hotspot.navn ||
                      hotspot.placeName ||
                      hotspot.id}
                  </h3>
                  <p>Klik for at se opslag</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* PostSildeOp for showing posts when pin is clicked */}
      <PostSildeOp
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        header={
          selectedHotspot
            ? selectedHotspot.title ||
              selectedHotspot.name ||
              selectedHotspot.navn ||
              selectedHotspot.placeName ||
              selectedHotspot.id
            : "Vælg et punkt"
        }
        externalPosts={filteredPosts}
        externalLoading={loading}
        disableBackdropClose={true}
        initialHeight={300}
        maxHeightPercent={80}
      />
    </div>
  );
}
