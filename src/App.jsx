// App.jsx
import { BrowserRouter, Routes, Route } from "react-router";
import Hometest from "./pages/Hometest.jsx";

import Login from "./pages/Login.jsx";
import OpretPost from "./pages/Opret_post.jsx";
import Signup from "./pages/Signup.jsx";
import Filtertest from "./pages/Filtertest.jsx";
import Test from "./pages/test.jsx";
import TestingMAPSTUFFPage from "./pages/Discover.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/*<Route path="/" element={<Hometest />} />*/}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/opretpost" element={<OpretPost />} />
        {/*<Route path="/filtertest" element={<Filtertest />} />*/}
        {/*<Route path="/test" element={<Test />} />*/}
        <Route path="/map" element={<TestingMAPSTUFFPage />} />
        <Route path="*" element={<TestingMAPSTUFFPage />} />
      </Routes>
    </BrowserRouter>
  );
}
