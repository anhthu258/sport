import { useEffect, useRef, useState } from "react";
import Map from "./Map.jsx";

export default function Discover() {
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const carouselRef = useRef(null);
  const slidesRef = useRef(null);
  const GAP = 12; // keep in sync with style gap
  const [panelX, setPanelX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [handleTop, setHandleTop] = useState(0);
  const drag = useRef({ startX: 0, panelAtStart: 0, id: null });
  const carDrag = useRef({
    active: false,
    id: null,
    startX: 0,
    startScroll: 0,
  });
  const slides = [
    {
      title: "DOKK1",
      meta: "3 aktive",
      sport: "Basketball",
      img: "/img/dokk123.png",
    },
    {
      title: "DOKK1",
      meta: "2 aktive",
      sport: "Volleyball",
      img: "/img/dokk123.png",
    },
    {
      title: "DOKK1",
      meta: "1 aktiv",
      sport: "Fodbold",
      img: "/img/dokk123.png",
    },
    {
      title: "DOKK1",
      meta: "4 aktive",
      sport: "Tennis",
      img: "/img/dokk123.png",
    },
  ];

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

  // Measure carousel height so the map handle starts below it (avoid interference)
  useEffect(() => {
    const update = () => {
      const h = carouselRef.current?.offsetHeight || 0;
      setHandleTop(h);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Track active slide based on horizontal scroll position
  useEffect(() => {
    const el = slidesRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      const step = w + GAP; // include gap so dots align
      const idx = Math.round(el.scrollLeft / step);
      setActiveSlide(Math.max(0, idx));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Desktop drag-to-scroll for the carousel (also works on touch)
  const onCarDown = (e) => {
    // Left click or touch only
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    try {
      e.preventDefault();
    } catch {}
    const el = slidesRef.current;
    if (!el) return;
    carDrag.current = {
      active: true,
      id: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    // Prevent text/image selection while dragging
    el.style.userSelect = "none";
    el.style.cursor = "grabbing";
  };
  const onCarMove = (e) => {
    if (!carDrag.current.active) return;
    e.stopPropagation();
    try {
      e.preventDefault();
    } catch {}
    if (e.pointerType === "mouse" && e.buttons === 0) {
      onCarUp(e);
      return;
    }
    const el = slidesRef.current;
    if (!el) return;
    const dx = e.clientX - carDrag.current.startX;
    el.scrollLeft = carDrag.current.startScroll - dx; // drag to scroll
  };
  const onCarUp = (e) => {
    if (!carDrag.current.active) return;
    e.stopPropagation();
    const el = slidesRef.current;
    if (el) {
      const w = el.clientWidth || 1;
      const step = w + GAP;
      const idx = Math.round(el.scrollLeft / step);
      el.scrollTo({ left: idx * step, behavior: "smooth" });
      setActiveSlide(idx);
      // Restore styles
      el.style.userSelect = "";
      el.style.cursor = "grab";
    }
    carDrag.current.active = false;
  };
  const onCarCancel = () => {
    if (!carDrag.current.active) return;
    const el = slidesRef.current;
    if (el) {
      el.style.userSelect = "";
      el.style.cursor = "grab";
    }
    carDrag.current.active = false;
  };

  // Support horizontal scrolling with mouse wheel (without Shift)
  const onCarWheel = (e) => {
    const el = slidesRef.current;
    if (!el) return;
    // If vertical wheel movement, translate to horizontal
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.stopPropagation();
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  };

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
        {/* Top carousel (not scrollable vertically) */}
        <div ref={carouselRef} style={{ padding: 12, position: "relative" }}>
          <div
            ref={slidesRef}
            style={{
              position: "relative",
              display: "flex",
              overflowX: "auto",
              overflowY: "hidden",
              scrollSnapType: "x mandatory",
              gap: GAP,
              WebkitOverflowScrolling: "touch",
              borderRadius: 16,
              scrollbarWidth: "none",
              // Improve gesture handling on mobile
              touchAction: "pan-x",
              overscrollBehaviorX: "contain",
              cursor: "grab",
            }}
            onPointerDown={onCarDown}
            onPointerMove={onCarMove}
            onPointerUp={onCarUp}
            onPointerCancel={onCarCancel}
            onWheel={onCarWheel}
          >
            {slides.map((s, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  flex: "0 0 100%",
                  height: 260,
                  borderRadius: 16,
                  overflow: "hidden",
                  scrollSnapAlign: "start",
                  scrollSnapStop: "always",
                  background: "#111827",
                }}
              >
                {/* Image fill */}
                <img
                  src={s.img}
                  alt={s.title}
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "contrast(1.02)",
                  }}
                  onDragStart={(e) => e.preventDefault()}
                />
                {/* Text overlay */}
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    bottom: 16,
                    color: "#fff",
                    transition: "opacity 220ms ease, transform 220ms ease",
                    opacity: activeSlide === i ? 1 : 0,
                    transform: `translateY(${activeSlide === i ? 0 : 8}px)`,
                  }}
                >
                  <div style={{ opacity: 0.9, fontSize: 12 }}>{s.meta}</div>
                  <div
                    style={{ fontWeight: 800, fontSize: 28, letterSpacing: 1 }}
                  >
                    {s.title}
                  </div>
                  <div style={{ opacity: 0.85, fontSize: 12 }}>{s.sport}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots overlay (fixed over carousel) */}
          <div
            style={{
              pointerEvents: "auto",
              position: "absolute",
              right: 20,
              bottom: 20,
              display: "flex",
              gap: 6,
            }}
          >
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const el = slidesRef.current;
                  if (!el) return;
                  const w = el.clientWidth || 1;
                  const step = w + GAP;
                  el.scrollTo({ left: i * step, behavior: "smooth" });
                }}
                aria-label={`Go to slide ${i + 1}`}
                style={{
                  width: 10,
                  height: 10,
                  padding: 0,
                  border: 0,
                  borderRadius: 999,
                  background: i === activeSlide ? "#fb923c" : "#ffffff55",
                  boxShadow:
                    i === activeSlide ? "0 0 0 2px #00000055" : undefined,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>

          {/* Activities strip */}
          <div
            style={{
              marginTop: 12,
              background: "#e5e7eb",
              color: "#111827",
              borderRadius: 16,
              padding: 12,
            }}
          >
            <div
              style={{ textAlign: "center", fontWeight: 700, marginBottom: 8 }}
            >
              Aktiviteter
            </div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              {["#fb4d3d", "#34d399", "#60a5fa", "#f59e0b"].map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: "#fff",
                    boxShadow: "inset 0 0 0 3px #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: c,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Prev/Next chevrons */}
          <button
            onClick={() => {
              const el = slidesRef.current;
              if (!el) return;
              const w = el.clientWidth || 1;
              const step = w + GAP;
              const idx = Math.max(0, activeSlide - 1);
              el.scrollTo({ left: idx * step, behavior: "smooth" });
            }}
            aria-label="Previous slide"
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#0008",
              color: "#fff",
              border: 0,
              borderRadius: 999,
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            ‹
          </button>
          <button
            onClick={() => {
              const el = slidesRef.current;
              if (!el) return;
              const w = el.clientWidth || 1;
              const step = w + GAP;
              const max = slides.length - 1;
              const idx = Math.min(max, activeSlide + 1);
              el.scrollTo({ left: idx * step, behavior: "smooth" });
            }}
            aria-label="Next slide"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#0008",
              color: "#fff",
              border: 0,
              borderRadius: 999,
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            ›
          </button>
        </div>

        {/* Rest of the page scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
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
          top: handleTop,
          right: 0,
          width: 28,
          height: `calc(100% - ${handleTop}px)`,
          zIndex: 2,
          cursor: dragging ? "grabbing" : "ew-resize",
          touchAction: "none",
        }}
        aria-label="Drag to reveal map"
      />
    </div>
  );
}
