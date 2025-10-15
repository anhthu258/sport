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
        <Route path="/" element={<Hometest />} />
        <Route path="/Discover" element={<Discover />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Map" element={<Map />} />
      </Routes>
    </BrowserRouter>
  );
}
