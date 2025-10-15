import { useEffect, useRef, useState } from "react";
import Map from "./Map.jsx";

// Discover page with the map visually behind a draggable, scrollable overlay panel.
export default function Discover() {
  const containerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const [panelX, setPanelX] = useState(0); // 0 = fully covering map, negative = revealing map to the right
  const [isDragging, setIsDragging] = useState(false);
  const [width, setWidth] = useState(0);

  const maxRevealRatio = 0.6; // reveal up to 60% of the screen width
  const maxRevealPx = Math.round(width * maxRevealRatio);
  const minSwipe = 50; // px threshold for snap

  useEffect(() => {
    const onResize = () =>
      setWidth(containerRef.current?.clientWidth || window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") {
        setPanelX(-maxRevealPx);
      } else if (e.key === "ArrowLeft") {
        setPanelX(0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [maxRevealPx]);

  const onTouchStart = (e) => {
    const t = e.changedTouches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    lastX.current = panelX;
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      const next = Math.min(0, Math.max(-maxRevealPx, lastX.current + dx));
      setPanelX(next);
    }
  };

  const onTouchEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    const t = e.changedTouches[0];
    const dx = t.clientX - startX.current;
    if (dx < -minSwipe) {
      setPanelX(-maxRevealPx);
    } else if (dx > minSwipe) {
      setPanelX(0);
    } else {
      setPanelX(Math.abs(panelX) > maxRevealPx / 2 ? -maxRevealPx : 0);
    }
  };

  const onMouseDown = (e) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    lastX.current = panelX;
    setIsDragging(true);
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      const next = Math.min(0, Math.max(-maxRevealPx, lastX.current + dx));
      setPanelX(next);
    }
  };
  const onMouseUp = () => setIsDragging(false);
  const onMouseLeave = () => setIsDragging(false);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Map layer (behind) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: panelX === 0 ? "none" : "auto",
        }}
      >
        <Map />
      </div>

      {/* Foreground discover panel */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          color: "#fff",
          transform: `translate3d(${panelX}px, 0, 0)`,
          transition: isDragging ? "none" : "transform 220ms ease",
          boxShadow: panelX === 0 ? "none" : "8px 0 24px rgba(0,0,0,0.35)",
          borderRight: panelX === 0 ? "none" : "1px solid #1f2937",
          touchAction: "pan-y",
        }}
      >
        <header
          style={{ padding: "16px 20px", borderBottom: "1px solid #1f2937" }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>Discover</h1>
          <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: 12 }}>
            Drag left to reveal the map (or press →). Drag right to close (or
            press ←).
          </p>
        </header>

        <main style={{ padding: 16, overflowY: "auto" }}>
          <div style={{ display: "grid", gap: 12 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <article
                key={i}
                style={{
                  background: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 16 }}>Spot #{i + 1}</h2>
                <p
                  style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 13 }}
                >
                  Scroll to browse. Drag left to peek at the map behind.
                </p>
              </article>
            ))}
          </div>
          <div style={{ height: 24 }} />
        </main>
      </div>
    </div>
  );
}
