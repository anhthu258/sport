import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons in bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow });

export default function Map() {
    useEffect(() => {
        // Apply default icon once
        L.Marker.prototype.options.icon = DefaultIcon;
    }, []);

    const center = [55.6761, 12.5683]; // Copenhagen as example

    return (
        <div style={{ height: "100dvh", width: "100%" }}>
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