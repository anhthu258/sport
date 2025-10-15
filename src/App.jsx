// App.jsx
import { BrowserRouter, Routes, Route } from "react-router";
import Discover from "./pages/Discover";
import Map from "./pages/Map";
import Login from "./pages/Login";
import Hometest from "./pages/Hometest";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default to Discover */}
        <Route path="/" element={<Hometest />} />
        <Route path="/" element={<Navigate to="/discover" replace />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/map" element={<Map />} />
        <Route path="/login" element={<Login />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/discover" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
