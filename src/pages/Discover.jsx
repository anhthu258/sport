import { useEffect, useRef, useState } from "react";
import Map from "./Map.jsx";

export default function Discover() {
  const containerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const [panelX, setPanelX] = useState(0); // 0 = cover map, -width = fully reveal map
  const [isDragging, setIsDragging] = useState(false);
  const [width, setWidth] = useState(0);

  const minSwipe = 50;

  useEffect(() => {
    const onResize = () =>
      setWidth(containerRef.current?.clientWidth || window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") setPanelX(-width);
      if (e.key === "ArrowLeft") setPanelX(0);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [width]);

  const clamp = (v) => Math.min(0, Math.max(-width, v));

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
      setPanelX(clamp(lastX.current + dx));
    }
  };
  const onTouchEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    const t = e.changedTouches[0];
    const dx = t.clientX - startX.current;
    if (dx < -minSwipe) setPanelX(-width);
    else if (dx > minSwipe) setPanelX(0);
    else setPanelX(Math.abs(panelX) > width / 2 ? -width : 0);
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
    if (Math.abs(dx) > Math.abs(dy)) setPanelX(clamp(lastX.current + dx));
  };
  const onMouseUp = () => setIsDragging(false);
  const onMouseLeave = () => setIsDragging(false);

  const fullyRevealed = Math.abs(panelX + width) < 1; // panelX === -width

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

      {fullyRevealed && (
        <button
          onClick={() => setPanelX(0)}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 2,
            background: "#111827cc",
            color: "#fff",
            border: "1px solid #1f2937",
            borderRadius: 8,
            padding: "8px 12px",
          }}
          aria-label="Back to Discover"
        >
          ← Back
        </button>
      )}

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
          touchAction: "pan-y",
          overscrollBehaviorX: "contain",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto" }} />
      </div>
    </div>
  );
}
