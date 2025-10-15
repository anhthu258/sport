// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Discover from "./pages/Korttest.jsx";
import Map from "./pages/Map.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default to Discover */}
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
