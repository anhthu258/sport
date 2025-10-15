import { useRef, useState } from "react";
import Map from "./Map.jsx";

export default function Discover() {
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelX, setPanelX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ startX: 0, panelAtStart: 0, id: null });

  const width = () => containerRef.current?.clientWidth || window.innerWidth;
  const clamp = (v) => Math.min(0, Math.max(-width(), v));
  const minSwipe = 50;

  // Drag handle events (kept tiny and focused)
  const onDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { startX: e.clientX, panelAtStart: panelX, id: e.pointerId };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setDragging(true);
  };
  const onMove = (e) => {
    if (!dragging) return;
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    const dx = e.clientX - drag.current.startX;
    setPanelX(clamp(drag.current.panelAtStart + dx));
  };
  const onUp = (e) => {
    if (!dragging) return;
    const dx = e.clientX - drag.current.startX;
    if (dx < -minSwipe) setPanelX(-width());
    else if (dx > minSwipe) setPanelX(0);
    else setPanelX(Math.abs(panelX) > width() / 2 ? -width() : 0);
    setDragging(false);
  };
  const onCancel = () => setDragging(false);

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
      {/* Map behind */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Map embedded />
      </div>

      {/* Foreground panel with YOUR content */}
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          color: "#fff",
          transform: `translate3d(${panelX}px, 0, 0)`,
          transition: dragging ? "none" : "transform 200ms ease",
        }}
      >
        {/*
          Add Discover content inside the scroll area below.
          Replace the sample cards with your own components.
        */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {/* SAMPLE CONTENT — replace freely */}
          <div style={{ display: "grid", gap: 12 }}>
            {[
              "Basketball Court",
              "Football Field",
              "Tennis Courts",
              "Running Track",
            ].map((title, i) => (
              <article
                key={i}
                style={{
                  background: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
                <p
                  style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 13 }}
                >
                  Replace this sample with your own content.
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Slim drag handle on the right edge */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 28,
          height: "100%",
          zIndex: 2,
          cursor: dragging ? "grabbing" : "ew-resize",
          touchAction: "none",
        }}
        aria-label="Drag to reveal map"
      />
    </div>
  );
}
