import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
    if (isHorizontal && dx >= minSwipe) {
      navigate("/discover");
    }
  };

  const center = [55.6761, 12.5683]; // Copenhagen as example

  return (
    <div
      style={{ height: "100dvh", width: "100%" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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
