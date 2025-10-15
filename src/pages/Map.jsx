import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons in bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow });

export default function Map() {
  const navigate = useNavigate();
  const startX = useRef(0);
  const startY = useRef(0);
  const endX = useRef(0);
  const endY = useRef(0);

  useEffect(() => {
    // Apply default icon once
    L.Marker.prototype.options.icon = DefaultIcon;
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") navigate("/discover");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const minSwipe = 50;
  const onTouchStart = (e) => {
    const t = e.changedTouches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
  };
  const onTouchMove = (e) => {
    const t = e.changedTouches[0];
    endX.current = t.clientX;
    endY.current = t.clientY;
  };
  const onTouchEnd = () => {
    const dx = endX.current - startX.current;
    const dy = endY.current - startY.current;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    // Left swipe to go back to Discover
    if (isHorizontal && dx <= -minSwipe) navigate("/discover");
  };

  const center = [55.6761, 12.5683]; // Copenhagen as example

  return (
    <div
      style={{ height: "100dvh", width: "100%" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Back button overlay */}
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
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          <Popup>Welcome to the map. Swipe back to Discover.</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
