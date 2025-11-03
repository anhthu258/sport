// App.jsx
import { BrowserRouter, Routes, Route } from "react-router";
import Login from "./pages/Login.jsx";
import OpretPost from "./pages/Opret_post.jsx";
import Signup from "./pages/Signup.jsx";
import Discover from "./pages/Discover.jsx";

export default function App() {
  return (
    <BrowserRouter>
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
