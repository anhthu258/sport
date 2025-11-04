// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import OpretPost from "./pages/OpretPost.jsx";
import Signup from "./pages/Signup.jsx";
import Discover from "./pages/Discover.jsx";

export default function App() {
  // Use "/sport" as base on GitHub Pages project hosting, "/" locally
  const basename = typeof window !== "undefined" && window.location?.pathname?.startsWith("/sport")
    ? "/sport"
    : "/";

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        {/*<Route path="/" element={<Hometest />} />*/}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/opretpost" element={<OpretPost />} />

        <Route path="/discover" element={<Discover />} />
        {/* Legacy alias */}
        <Route path="/map" element={<Discover />} />
        <Route path="*" element={<Discover />} />
      </Routes>
    </BrowserRouter>
  );
}
