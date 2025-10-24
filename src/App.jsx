// App.jsx
import { BrowserRouter, Routes, Route } from "react-router";
import Hometest from "./pages/Hometest.jsx";

import Login from "./pages/Login.jsx";
import LoginForm from "./components/LoginForm.jsx";
import OpretPost from "./pages/Opret_post.jsx";
import Signup from "./pages/Signup.jsx";
import Filtertest from "./pages/Filtertest.jsx";
import Test from "./pages/test.jsx";
import TestingMAPSTUFFPage from "./pages/TestingMAPSTUFFPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* No automatic redirects so you can navigate directly while testing */}
        <Route path="/" element={<Hometest />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/opretpost" element={<OpretPost />} />
        <Route path="/filtertest" element={<Filtertest />} />
        <Route path="/test" element={<Test />} />
        <Route path="/testing-map" element={<TestingMAPSTUFFPage />} />
        <Route path="/login-form" element={<LoginForm />} />
        {/* Removed alias to avoid duplicate paths */}
        {/* Optional: simple 404 without redirect */}
        <Route
          path="*"
          element={<div style={{ padding: 16 }}>Not found</div>}
        />
      </Routes>
    </BrowserRouter>
  );
}
