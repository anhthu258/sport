import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Map({ embedded = false }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (embedded) return;
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") navigate("/discover");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate, embedded]);

  // Map page only: keyboard back to Discover. Swipe is handled by Discover when embedded.

  const center = [56.1629, 10.2039]; // [lat, lng] Aarhus

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
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}
