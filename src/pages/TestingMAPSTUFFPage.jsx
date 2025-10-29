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
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import "../Styling/TestingMAPSTUFF.css";
import Filter from "../components/Filter.jsx";
import PostSildeOp from "../components/PostSildeOp";
import { db } from "../assets/firebase.js";
import { collection, onSnapshot } from "firebase/firestore";

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
  const HANDLE_BUFFER = 8; // extra pixels below slides before the drag gutter starts
  // --- UI/gesture state ---
  const [panelX, setPanelX] = useState(0); // panel translateX in px
  const [dragging, setDragging] = useState(false); // true while dragging panel
  const [activeSlide, setActiveSlide] = useState(0); // current carousel index
  const [handleTop, setHandleTop] = useState(0); // gutter starts below carousel
  const [selectedSport, setSelectedSport] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);
  // Bottom sheet (PostSildeOp) visibility
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [selectedHotspotName, setSelectedHotspotName] =
    useState("Vælg et punkt");
  const drag = useRef({ startX: 0, panelAtStart: 0, id: null });
  const carDrag = useRef({
    active: false,
    id: null,
    startX: 0,
    startScroll: 0,
  });
  const [sliderInteracting, setSliderInteracting] = useState(false);

  // Simple static slider content: title, sport label, image, and mock active count
  const slides = useMemo(
    () => [
      {
        title: "Havnen",
        sport: "Fodbold",
        img: "/img/LokationImg/havnen.jpg",
        meta: "1 aktiv",
      },
      {
        title: "Navitas",
        sport: "Tennis",
        img: "/img/LokationImg/navitas.jpg",
        meta: "3 aktive",
      },
      {
        title: "Frederiksberg Idrætscenter",
        sport: "Basketball",
        img: "/img/LokationImg/frederiksbergidraetscenter.jpg",
        meta: "0 aktive",
      },
      {
        title: "Frederiksberg Skole",
        sport: "Volleyball",
        img: "/img/LokationImg/frederiksbergskole.jpg",
        meta: "2 aktive",
      },
    ],
    []
  );

  // Helper: ask the map iframe to focus a hotspot by title/id
  const focusHotspot = useCallback((query) => {
    const frame = frameRef.current;
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage(
        {
          source: "discover",
          type: "focusHotspot",
          query: (query || "").toString(),
        },
        window.location.origin
      );
    } catch (e) {
      // no-op
    }
  }, []);

  // --- Geometry helpers ---
  const width = useCallback(
    () => containerRef.current?.clientWidth || window.innerWidth,
    []
  ); // container width
  const clamp = useCallback((v) => Math.min(0, Math.max(-width(), v)), [width]); // bound panel in [-W, 0]
  const minSwipe = 50; // px threshold for open/close decision

  const isHidden = useCallback(
    () => Math.abs(panelX) >= width() - 1,
    [panelX, width]
  ); // treat as fully hidden

  // PostSildeOp åbner kun når man klikker på pins, ikke automatisk når panelet er skjult

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
    } catch {
      // Ignore preventDefault errors
    }
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

  // Measure slides (image container) height so the right drag gutter starts BELOW the images
  useEffect(() => {
    const update = () => {
      const h = slidesRef.current?.offsetHeight || 0;
      // Start the right drag gutter just below the visible slides to prevent accidental reveal while interacting
      setHandleTop(Math.max(0, h + HANDLE_BUFFER));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Ingen tap-to-reveal adfærd; reveal handle er permanent tilgængelig
  // når panelet er fuldt skjult.

  // Lyt efter hotspot klik fra iframe kort og opdater sheet titel + filtrer posts
  useEffect(() => {
    const onMessage = (e) => {
      try {
        // More flexible origin check for development
        const isLocalhost =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        const isSameOrigin = e.origin === window.location.origin;
        const isLocalhostOrigin =
          isLocalhost &&
          (e.origin.includes("localhost") || e.origin.includes("127.0.0.1"));

        if (!isSameOrigin && !isLocalhostOrigin) {
          return; // same-origin guard
        }
        const d = e.data || {};
        if (d && d.source === "map-anker" && d.type === "hotspotClick") {
          const t = (d.title || "").toString().trim();
          const hotspotId = (d.hotspotId || "").toString().trim();
          console.log("Hotspot clicked:", {
            title: t,
            hotspotId,
            isHidden: isHidden(),
          });
          if (t) setSelectedHotspotName(t);
          if (hotspotId) {
            setSelectedHotspotId(hotspotId);
            console.log("Setting sheetOpen to true");
            setSheetOpen(true); // Åbn sheet når man klikker på pin
          }
        }
      } catch (error) {
        console.error("Error in message handler:", error);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isHidden, posts]);

  // Track active slide based on horizontal scroll position
  useEffect(() => {
    const el = slidesRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      const step = w + GAP;
      const idx = Math.round(el.scrollLeft / step);
      const max = slides.length - 1;
      setActiveSlide(Math.max(0, Math.min(max, idx)));
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
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() || {}),
          // Konverter Firebase timestamp til JavaScript Date
          timestamp: d.data().timestamp?.toDate
            ? d.data().timestamp.toDate()
            : d.data().timestamp,
        }));
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

  // Afled filtrerede posts efter sport og hotspot
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Filtrer efter sport hvis valgt
    if (selectedSport) {
      filtered = filtered.filter(
        (p) => (p.sport || "").toString() === selectedSport
      );
    }

    // Filtrer efter hotspot hvis valgt
    if (selectedHotspotId) {
      filtered = filtered.filter(
        (p) => (p.hotspotId || "").toString() === selectedHotspotId
      );
    }

    return filtered;
  }, [posts, selectedSport, selectedHotspotId]);

  // Desktop drag-to-scroll for karussellen (touch swipe virker allerede)
  const onCarDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    try {
      e.preventDefault();
    } catch {
      /* ignore */
    }
    setSliderInteracting(true);
    const el = slidesRef.current;
    if (!el) return;
    carDrag.current.active = true;
    carDrag.current.id = e.pointerId;
    carDrag.current.startX = e.clientX;
    carDrag.current.startScroll = el.scrollLeft;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Minimal drag behavior: directly update scrollLeft while dragging
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
    // Direct scroll: no snapping or smoothing here
    el.scrollLeft = carDrag.current.startScroll - dx;
  };
  const onCarUp = (e) => {
    if (!carDrag.current.active) return;
    e.stopPropagation();
    const el = slidesRef.current;
    if (el) {
      // Snap cleanly to the nearest slide for a normal carousel feel
      const w = el.clientWidth || 1;
      const step = w + GAP;
      const pos = el.scrollLeft;
      let idx = Math.round(pos / step);
      const max = slides.length - 1;
      if (idx < 0) idx = 0;
      if (idx > max) idx = max;
      el.scrollTo({ left: idx * step, behavior: "smooth" });
      setActiveSlide(idx);
      el.style.userSelect = "";
      el.style.cursor = "grab";
    }
    carDrag.current.active = false;
    setSliderInteracting(false);
  };
  const onCarCancel = () => {
    if (!carDrag.current.active) return;
    const el = slidesRef.current;
    if (el) {
      // Also snap on cancel to keep slides aligned nicely
      const w = el.clientWidth || 1;
      const step = w + GAP;
      const pos = el.scrollLeft;
      let idx = Math.round(pos / step);
      const max = slides.length - 1;
      if (idx < 0) idx = 0;
      if (idx > max) idx = max;
      el.scrollTo({ left: idx * step, behavior: "smooth" });
      setActiveSlide(idx);
      el.style.userSelect = "";
      el.style.cursor = "grab";
    }
    carDrag.current.active = false;
    setSliderInteracting(false);
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

  // Beregn venstre position for reveal tab så den følger panelkanten
  const revealLeft = (() => {
    const w = width();
    const panelRightEdge = w + panelX; // panel's right edge in viewport px
    const minLeft = HANDLE_MARGIN;
    const maxLeft = w - (HANDLE_WIDTH + HANDLE_MARGIN);
    // Placer handle centreret på kanten, begrænset til viewport
    const desired = panelRightEdge - HANDLE_WIDTH / 2;
    return Math.max(minLeft, Math.min(maxLeft, desired));
  })();

  return (
    <div ref={containerRef} className="tm-root">
      {/* Kort lag (iframe) */}
      <iframe
        title="MapAnker"
        src="/MapAnker.html"
        className="tm-map-frame"
        allow="geolocation; fullscreen"
        ref={frameRef}
      />

      {/* Overlappende Discover panel */}
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
            onPointerEnter={() => setSliderInteracting(true)}
            onPointerLeave={() => setSliderInteracting(false)}
          >
            {slides.map((s, i) => (
              <div
                key={i}
                className="tm-slide"
                onClick={() => focusHotspot(s.title)}
                role="button"
                aria-label={`Fokusér ${s.title} på kortet`}
              >
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
                  <div className="tm-slide-title">{s.title}</div>
                  <div className="tm-slide-sport">{s.sport || ""}</div>
                </div>
                <div className="tm-slide-stats">
                  <span className="tm-live-dot" aria-hidden="true" />
                  <span className="tm-live-text">{s.meta}</span>
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

          {/* Filter komponent til valg af sport */}

          <div className="tm-activities">
            <Filter
              selectedSport={selectedSport}
              onFilterChange={({ sportId }) => setSelectedSport(sportId)}
              sports={[
                {
                  id: "Basketball",
                  name: "",
                  icon: (
                    <>
                      <img
                        src="/img/basketball-white.png"
                        alt="Basketball"
                        className="filter-icon-default"
                      />
                      <img
                        src="/img/basketball-black.png"
                        alt="Basketball"
                        className="filter-icon-active"
                      />
                    </>
                  ),
                },
                {
                  id: "Volleyball",
                  name: "",
                  icon: (
                    <>
                      <img
                        src="/img/volley-white.png"
                        alt="Volleyball"
                        className="filter-icon-default"
                      />
                      <img
                        src="/img/volley-black.png"
                        alt="Volleyball"
                        className="filter-icon-active"
                      />
                    </>
                  ),
                },
                {
                  id: "Fodbold",
                  name: "",
                  icon: (
                    <>
                      <img
                        src="/img/fodbold-white.png"
                        alt="Fodbold"
                        className="filter-icon-default"
                      />
                      <img
                        src="/img/fodbold-black.png"
                        alt="Fodbold"
                        className="filter-icon-active"
                      />
                    </>
                  ),
                },
                {
                  id: "Tennis",
                  name: "",
                  icon: (
                    <>
                      <img
                        src="/img/tennis-white.png"
                        alt="Tennis"
                        className="filter-icon-default"
                      />
                      <img
                        src="/img/tennis-black.png"
                        alt="Tennis"
                        className="filter-icon-active"
                      />
                    </>
                  ),
                },
              ]}
            />
          </div>

          {/* slut på filter kode */}

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

      {/* Højre side gutter brugt til at trække panelet */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        className={`tm-handle${dragging ? " dragging" : ""}`}
        style={{
          "--handle-top": `${handleTop}px`,
          pointerEvents: sliderInteracting ? "none" : "auto",
        }}
        aria-label="Drag to reveal map"
      />

      {/* Venstre kant reveal tab der følger panelkanten når skjult */}
      {panelX < 0 && (
        <button
          className="tm-reveal-handle"
          aria-label="Vis Discover-panelet"
          type="button"
          style={{ left: `${revealLeft}px` }}
          onPointerDown={(e) => {
            // Tillad drag-to-open startende fra handle
            // Luk bottom sheet for at undgå interaktionskonflikter under trækning
            setSheetOpen(false);
            onDown(e);
          }}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
        >
          <span className="tm-reveal-arrow">›</span>
        </button>
      )}

      {/* Post slide-up sheet overlay: kun synlig når panel er fuldt skjult og en pin klikkes */}
      <PostSildeOp
        open={isHidden() && sheetOpen}
        onClose={() => {
          console.log(
            "PostSildeOp onClose called - setting sheetOpen to false"
          );
          setSheetOpen(false);
        }}
        initialHeight={400}
        maxHeightPercent={80}
        disableBackdropClose={false}
        externalPosts={filteredPosts}
        externalLoading={loadingPosts}
        hotspotName={selectedHotspotName}
        hotspotId={selectedHotspotId}
      />
      {/* Debug info - kun i udvikling */}
      {console.log(
        "TestingMAPSTUFFPage render - isHidden:",
        isHidden(),
        "sheetOpen:",
        sheetOpen,
        "open prop:",
        isHidden() && sheetOpen
      )}
    </div>
  );
}
