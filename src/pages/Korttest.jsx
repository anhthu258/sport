import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

// Mobile-first Discover page with swipe left -> navigate to /map
export default function Korttest() {
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") navigate("/map");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate]);

  const minSwipeDistance = 50; // px

  const onTouchStart = (e) => {
    const touch = e.changedTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const onTouchMove = (e) => {
    const touch = e.changedTouches[0];
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;
  };

  const onTouchEnd = () => {
    const dx = touchEndX.current - touchStartX.current;
    const dy = touchEndY.current - touchStartY.current;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    if (isHorizontal && dx <= -minSwipeDistance) {
      navigate("/map");
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        color: "#fff",
      }}
    >
      <header style={{ padding: "16px 20px", borderBottom: "1px solid #1f2937" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Discover sports near you</h1>
        <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: 12 }}>
          Swipe left to open the map
        </p>
      </header>

      <main style={{ flex: 1, padding: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {["Basketball Court", "Football Field", "Tennis Courts", "Running Track"].map(
            (title, idx) => (
              <article
                key={idx}
                style={{
                  background: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
                <p style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 13 }}>
                  Popular spot nearby. Tap to learn more. Swipe left to see all on the map.
                </p>
              </article>
            )
          )}
        </div>
      </main>

      <footer
        style={{
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "#9ca3af",
          borderTop: "1px solid #1f2937",
        }}
      >
        <span>Swipe to map</span>
        <span aria-hidden>⟶</span>
      </footer>
    </div>
  );
}
