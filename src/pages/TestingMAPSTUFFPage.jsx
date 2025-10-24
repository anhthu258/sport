import { useEffect, useRef, useState, useMemo } from "react";
import "../Styling/TestingMAPSTUFF.css";
import Filter from "../components/Filter.jsx";
import { db } from "../assets/firebase.js";
import { collection, getDocs } from "firebase/firestore";

export default function TestingMAPSTUFFPage() {
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const panelRef = useRef(null);
  const carouselRef = useRef(null);
  const slidesRef = useRef(null);
  const GAP = 12; // keep in sync with CSS gap
  const HANDLE_WIDTH = 40; // keep in sync with CSS .tm-reveal-handle width
  const HANDLE_MARGIN = 12;
  const [panelX, setPanelX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [handleTop, setHandleTop] = useState(0);
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

  const width = () => containerRef.current?.clientWidth || window.innerWidth;
  const clamp = (v) => Math.min(0, Math.max(-width(), v));
  const minSwipe = 50;

  const isHidden = () => Math.abs(panelX) >= width() - 1;

  // Drag handle events
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
    if (!dragging) return;
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    const dx = e.clientX - drag.current.startX;
    setPanelX(clamp(drag.current.panelAtStart + dx));
  };
  const onUp = () => {
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

  // Measure carousel height so the map handle starts below it
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

  // Load posts once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingPosts(true);
        const snap = await getDocs(collection(db, "posts"));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        if (!cancelled) setPosts(list);
      } catch (err) {
        console.error("Failed to load posts", err);
        if (!cancelled) setPostsError("Kunne ikke hente opslag");
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive filtered posts by sport
  const filteredPosts = useMemo(() => {
    if (!selectedSport) return posts;
    return posts.filter((p) => (p.sport || "").toString() === selectedSport);
  }, [posts, selectedSport]);

  // Desktop drag-to-scroll for the carousel
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
      <iframe
        title="MapAnker"
        src="/MapAnker.html"
        className="tm-map-frame"
        allow="geolocation; fullscreen"
        ref={frameRef}
      />

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
                { id: "basketball", name: "Basketball" },
                { id: "football", name: "Fodbold" },
                { id: "tennis", name: "Tennis" },
                { id: "volleyball", name: "Volleyball" },
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

      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        className={`tm-handle${dragging ? " dragging" : ""}`}
        style={{ "--handle-top": `${handleTop}px` }}
        aria-label="Drag to reveal map"
      />

      {/* Left-edge on-demand reveal handle over the map */}
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
