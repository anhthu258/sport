/*
===============================================================================
TestingMAPSTUFFPage – Map iframe + Discover overlay
-------------------------------------------------------------------------------
Layers
- Map layer: an iframe pointing to /MapAnker.html (Mapbox GL + Firestore).
- UI layer: a Discover-style panel rendered in React above the iframe.

Panel behavior
- panelX drives the panel's X translation via CSS var --panel-x (px).
  0 => panel fully open, -width() => fully hidden.
- Right-side invisible gutter (.tm-handle) starts below the carousel; drag it
  horizontally to hide/reveal the panel.
- When hidden (panelX < 0), a left-side tab (.tm-reveal-handle) appears over
  the map and follows the panel's right edge; you can drag it to bring the
  panel back.

Carousel behavior
- Horizontal scroll with snap points; desktop drag converts pointer movement
  into scroll. Dots/buttons jump to specific slides.

Data
- Posts are fetched once from Firestore (db -> posts collection). The list
  can be filtered by sport using the Filter component.
===============================================================================
*/
import { useEffect, useRef, useState, useMemo } from "react";
import "../Styling/TestingMAPSTUFF.css";
import Filter from "../components/Filter.jsx";
import { db } from "../assets/firebase.js";
import { collection, getDocs, onSnapshot } from "firebase/firestore";

export default function TestingMAPSTUFFPage() {
  // --- Refs to DOM elements we measure or control ---
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const panelRef = useRef(null);
  const carouselRef = useRef(null);
  const slidesRef = useRef(null);
  const GAP = 12; // keep in sync with CSS gap for .tm-slides
  const HANDLE_WIDTH = 40; // keep in sync with CSS .tm-reveal-handle width
  const HANDLE_MARGIN = 12;
  // --- UI/gesture state ---
  const [panelX, setPanelX] = useState(0); // panel translateX in px
  const [dragging, setDragging] = useState(false); // true while dragging panel
  const [activeSlide, setActiveSlide] = useState(0); // current carousel index
  const [handleTop, setHandleTop] = useState(0); // gutter starts below carousel
  const [selectedSport, setSelectedSport] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);
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

  // --- Geometry helpers ---
  const width = () => containerRef.current?.clientWidth || window.innerWidth; // container width
  const clamp = (v) => Math.min(0, Math.max(-width(), v)); // bound panel in [-W, 0]
  const minSwipe = 50; // px threshold for open/close decision

  const isHidden = () => Math.abs(panelX) >= width() - 1; // treat as fully hidden

  // --- Drag handle events ---
  // Attach global listeners so dragging continues even if the pointer leaves the handle
  const attachWindowDrag = () => {
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };
  const detachWindowDrag = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
  };

  const onDown = (e) => {
    // Begin a panel drag either from the right gutter or the left reveal tab
    try {
      e.preventDefault();
    } catch {}
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { startX: e.clientX, panelAtStart: panelX, id: e.pointerId };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDragging(true);
    attachWindowDrag();
  };
  const onMove = (e) => {
    // Update panel position while dragging
    if (!dragging) return;
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    const dx = e.clientX - drag.current.startX;
    setPanelX(clamp(drag.current.panelAtStart + dx));
  };
  const onUp = () => {
    // Settle panel open/closed based on swipe distance or midpoint
    if (!dragging) return;
    const dx = drag.current ? drag.current.panelAtStart - panelX : 0;
    if (-dx < -minSwipe) setPanelX(-width());
    else if (-dx > minSwipe) setPanelX(0);
    else setPanelX(Math.abs(panelX) > width() / 2 ? -width() : 0);
    setDragging(false);
    detachWindowDrag();
  };
  const onCancel = () => {
    setDragging(false);
    detachWindowDrag();
  };

  // Measure carousel height so the right drag gutter starts below it
  useEffect(() => {
    const update = () => {
      const h = carouselRef.current?.offsetHeight || 0;
      setHandleTop(h);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // No tap-to-reveal behavior; the reveal handle is permanently available
  // whenever the panel is fully hidden.

  // Track active slide based on horizontal scroll position
  useEffect(() => {
    const el = slidesRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      const step = w + GAP;
      const idx = Math.round(el.scrollLeft / step);
      setActiveSlide(Math.max(0, idx));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // LIVE UPDATES: Subscribe to Firestore 'posts' collection in realtime
  // - onSnapshot attaches a listener that fires immediately with the current
  //   documents and again on every change (add/update/delete).
  // - We map the snapshot to a simple array of post objects and set local state.
  // - The unsubscribe function returned by onSnapshot is called on unmount to
  //   avoid memory leaks.
  useEffect(() => {
    setLoadingPosts(true);
    const unsubscribe = onSnapshot(
      collection(db, "posts"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        setPosts(list);
        setLoadingPosts(false);
      },
      (err) => {
        console.error("Firestore onSnapshot(posts) failed", err);
        setPostsError("Kunne ikke hente opslag");
        setLoadingPosts(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Derive filtered posts by sport
  const filteredPosts = useMemo(() => {
    if (!selectedSport) return posts;
    return posts.filter((p) => (p.sport || "").toString() === selectedSport);
  }, [posts, selectedSport]);

  // Desktop drag-to-scroll for the carousel (touch swipe already works)
  const onCarDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    try {
      e.preventDefault();
    } catch {
      /* ignore */
    }
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
    } catch {
      /* ignore */
    }
    el.style.userSelect = "none";
    el.style.cursor = "grabbing";
  };
  const onCarMove = (e) => {
    if (!carDrag.current.active) return;
    e.stopPropagation();
    try {
      e.preventDefault();
    } catch {
      /* ignore */
    }
    if (e.pointerType === "mouse" && e.buttons === 0) {
      onCarUp(e);
      return;
    }
    const el = slidesRef.current;
    if (!el) return;
    const dx = e.clientX - carDrag.current.startX;
    el.scrollLeft = carDrag.current.startScroll - dx;
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
  const onCarWheel = (e) => {
    const el = slidesRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.stopPropagation();
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  };

  // Compute left position for the reveal tab so it follows the panel edge
  const revealLeft = (() => {
    const w = width();
    const panelRightEdge = w + panelX; // panel's right edge in viewport px
    const minLeft = HANDLE_MARGIN;
    const maxLeft = w - (HANDLE_WIDTH + HANDLE_MARGIN);
    // Place handle centered on the edge, clamped to viewport
    const desired = panelRightEdge - HANDLE_WIDTH / 2;
    return Math.max(minLeft, Math.min(maxLeft, desired));
  })();

  return (
    <div ref={containerRef} className="tm-root">
      {/* Map layer (iframe) */}
      <iframe
        title="MapAnker"
        src="/MapAnker.html"
        className="tm-map-frame"
        allow="geolocation; fullscreen"
        ref={frameRef}
      />

      {/* Overlayed Discover panel */}
      <div
        ref={panelRef}
        className={`tm-panel${dragging ? " dragging" : ""}`}
        style={{ "--panel-x": `${panelX}px` }}
      >
        <div ref={carouselRef} className="tm-carousel">
          <div
            ref={slidesRef}
            className="tm-slides"
            onPointerDown={onCarDown}
            onPointerMove={onCarMove}
            onPointerUp={onCarUp}
            onPointerCancel={onCarCancel}
            onWheel={onCarWheel}
          >
            {slides.map((s, i) => (
              <div key={i} className="tm-slide">
                <img
                  src={s.img}
                  alt={s.title}
                  draggable={false}
                  className="tm-slide-img"
                  onDragStart={(e) => e.preventDefault()}
                />
                <div
                  className={`tm-slide-text${
                    activeSlide === i ? " active" : ""
                  }`}
                >
                  <div className="tm-slide-meta">{s.meta}</div>
                  <div className="tm-slide-title">{s.title}</div>
                  <div className="tm-slide-sport">{s.sport}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="tm-dots">
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
                className={`tm-dot${i === activeSlide ? " active" : ""}`}
              />
            ))}
          </div>

          <div className="tm-activities">
            <Filter
              selectedSport={selectedSport}
              onFilterChange={({ sportId }) => setSelectedSport(sportId)}
              sports={[
                {
                  id: "Basketball",
                  name: "Basketball",
                  icon: (
                    <img src="/img/basketball-black.png" alt="Basketball" />
                  ),
                },
                {
                  id: "Fodbold",
                  name: "Fodbold",
                  icon: <img src="/img/fodbold-black.png" alt="Fodbold" />,
                },
                {
                  id: "Tennis",
                  name: "Tennis",
                  icon: <img src="/img/tennis-black.png" alt="Tennis" />,
                },
                {
                  id: "Volleyball",
                  name: "Volleyball",
                  icon: <img src="/img/volley-black.png" alt="Volleyball" />,
                },
              ]}
            />
          </div>

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
            className="tm-chevron tm-prev"
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
            className="tm-chevron tm-next"
          >
            ›
          </button>
        </div>

        <div className="tm-content">
          {postsError && <div className="tm-error">{postsError}</div>}
          {loadingPosts && posts.length === 0 ? (
            <div className="tm-muted">Indlæser...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="tm-muted">
              Ingen opslag for den valgte sportsgren.
            </div>
          ) : (
            <div className="tm-post-list">
              {filteredPosts.map((post) => (
                <article key={post.id} className="tm-post-card">
                  <h2 className="tm-post-title">{post.title || "Untitled"}</h2>
                  <p className="tm-post-text">
                    {post.details || "Ingen detaljer"}
                  </p>
                  {post.time && (
                    <div className="tm-post-time">Tidspunkt: {post.time}</div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right-side gutter used to drag the panel */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        className={`tm-handle${dragging ? " dragging" : ""}`}
        style={{ "--handle-top": `${handleTop}px` }}
        aria-label="Drag to reveal map"
      />

      {/* Left-edge reveal tab that follows the panel edge when hidden */}
      {panelX < 0 && (
        <button
          className="tm-reveal-handle"
          aria-label="Vis Discover-panelet"
          type="button"
          style={{ left: `${revealLeft}px` }}
          onPointerDown={(e) => {
            // Allow drag-to-open starting from the handle
            onDown(e);
          }}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
        >
          <span className="tm-reveal-arrow">›</span>
        </button>
      )}
    </div>
  );
}
