import { Link } from "react-router-dom";

export default function Home() {
  const linkStyle = {
    display: "block",
    padding: "12px 16px",
    margin: "8px 0",
    background: "#111827",
    color: "#ffffff",
    borderRadius: 8,
    textDecoration: "none",
    border: "1px solid #1f2937",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        padding: 16,
        background: "#0f172a",
        color: "#fff",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Home (Testing Nav)</h1>
      <p>Quick links to test each page without redirects:</p>
      <nav style={{ marginTop: 16 }}>
        <Link to="/discover" style={linkStyle}>
          Discover (Korttest)
        </Link>
        <Link to="/map" style={linkStyle}>
          Map (Leaflet)
        </Link>
        <Link to="/login" style={linkStyle}>
          Login
        </Link>
      </nav>
    </div>
  );
}
