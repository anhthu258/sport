/*
  Discover-side med kort-iframe og overlay-panel.

  Kortlag: iframe der loader /MapAnker.html (Mapbox GL + Firestore).
  UI-lag: React-panel ovenpå iframe med karussel, filter og lokationsliste.

  Kortfremvisning:
  - `panelX` styrer panelets translateX via CSS-var `--panel-x` (0 = åben,
    -width = skjult).
  - Højre, usynlig "gutter" (.tm-handle) bruges til at trække panelet.
  - Når panelet er skjult vises en venstre "reveal"-tab (.tm-reveal-handle)
    der kan trækkes for at åbne panelet.

  Karussel:
  - Horisontal scroll med snap; desktop-musen kan trække for at scrolle.
  - Dots/knapper kan hoppe til et bestemt slide.

  Data:
  - `hotspots` hentes en gang (getDocs).
  - `posts` abonneres live via `onSnapshot`.
*/
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import "../Styling/Discover.css";
import Filter from "../components/Filter.jsx";
import PostSlideOp from "../components/PostSlideOp.jsx";
import { db } from "../assets/firebase.js";
import { collection, onSnapshot, getDocs } from "firebase/firestore";

export default function TestingMAPSTUFFPage() {
  /* ========================================
    REFS & KONSTANTER
    ======================================== */
  // --- Refs til DOM-elementer der måles eller styres ---
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const panelRef = useRef(null);
  const carouselRef = useRef(null);
  const slidesRef = useRef(null);
  const GAP = 12; // skal svare til CSS gap for .tm-slides
  const HANDLE_WIDTH = 40; // skal svare til CSS .tm-reveal-handle width
  const HANDLE_MARGIN = 12;
  const HANDLE_BUFFER = 8; // ekstra px under slides før drag-gutten starter
  /* ========================================
    UI / GESTION
    ======================================== */
  // --- UI / gestions-tilstand ---
  const [panelX, setPanelX] = useState(0); // panel translateX in px
  const [dragging, setDragging] = useState(false); // true while dragging panel
  const [activeSlide, setActiveSlide] = useState(0); // current carousel index
  const [handleTop, setHandleTop] = useState(0); // gutter starts below carousel
  const [selectedSport, setSelectedSport] = useState(null);
  const [posts, setPosts] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [filteredHotspots, setFilteredHotspots] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
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

  /* ========================================
    BILLEDER / HJÆLPERE
    ======================================== */
  // --- Billedhjælper ---
  // Returnerer korrekt billed-URL for en lokation. Modtager enten et
  // hotspot-objekt eller et navn (string).
  const getLocationImage = (hotspotOrName) => {
    const locationImageMap = {
      DOKK1: "img/LokationImg/dokk123.png",
      Havnen: "img/LokationImg/havnen.jpg",
      Navitas: "img/LokationImg/navitas.jpg",
      Island: "img/LokationImg/oen.jpg",
      Frederiksbergsvoemmehal: "img/LokationImg/frederiksbergidraetscenter.jpg",
      Frederiksbergskole: "img/LokationImg/frederiksbergskole.jpg",
    };

    if (!hotspotOrName) return locationImageMap.DOKK1;

    // Hvis der kommer et helt hotspot-objekt med en specifik img, brug den
    if (typeof hotspotOrName === "object") {
      if (hotspotOrName.img) return hotspotOrName.img;
      const name =
        hotspotOrName.name ||
        hotspotOrName.title ||
        hotspotOrName.navn ||
        hotspotOrName.placeName ||
        hotspotOrName.id ||
        "";
      if (locationImageMap[name]) return locationImageMap[name];
      const lower = name.toLowerCase();
      for (const [key, val] of Object.entries(locationImageMap)) {
        if (lower === key.toLowerCase()) return val;
      }
      return locationImageMap.DOKK1;
    }

    // Hvis der kommer et navn (string)
    if (typeof hotspotOrName === "string") {
      const name = hotspotOrName;
      if (locationImageMap[name]) return locationImageMap[name];
      const lower = name.toLowerCase();
      for (const [key, val] of Object.entries(locationImageMap)) {
        if (lower === key.toLowerCase()) return val;
      }
      return locationImageMap.DOKK1;
    }

    return locationImageMap.DOKK1;
  };

  /* ========================================
    KARUSSEL (STATISK)
    ======================================== */
  // --- Statisk karusselindhold ---
  // Simpelt sæt slides til preview / navigation (titel, sport, billede, meta).

  // Simple static slider content: title, sport label, image, and mock active count
  const slides = useMemo(
    () => [
      {
        title: "Havnen",
        sport: "Fodbold",
        img: "img/LokationImg/havnen.jpg",
        meta: "1 aktiv",
      },
      {
        title: "Navitas",
        sport: "Basketball",
        img: "img/LokationImg/navitas.jpg",
        meta: "3 aktive",
      },
      {
        title: "Frederiksberg Idrætscenter",
        sport: "Basketball",
        img: "img/LokationImg/frederiksbergidraetscenter.jpg",
        meta: "0 aktive",
      },
      {
        title: "Frederiksberg Skole",
        sport: "Fodbold",
        img: "img/LokationImg/frederiksbergskole.jpg",
        meta: "2 aktive",
      },
    ],
    []
  );

  /* ========================================
    IFRAME - KOMMUNIKATION
    ======================================== */
  // --- Kommunikation med iframe ---
  // Sender et postMessage til iframe for at få kortet til at fokusere en
  // hotspot (søgestreng kan være id eller titel).
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
    } catch {
      // no-op
    }
  }, []);

  /* ========================================
    GEOMETRI & LAYOUT
    ======================================== */
  // --- Geometri-helpers ---
  const width = useCallback(
    () => containerRef.current?.clientWidth || window.innerWidth,
    []
  ); // container width
  const clamp = useCallback((v) => Math.min(0, Math.max(-width(), v)), [width]); // begræns panel i [-W, 0]
  const minSwipe = 50; // px tærskel for at beslutte åben/lukket

  const isHidden = useCallback(
    () => Math.abs(panelX) >= width() - 1,
    [panelX, width]
  ); // treat as fully hidden

  // Note: `PostSildeOp` åbnes kun ved klik på kort-pins, ikke automatisk når
  // panelet er skjult.

  /* ========================================
    DRAG / PANEL-HÅNDTERING
    ======================================== */
  // --- Drag/håndtag events ---
  // Globale lyttere sikrer at drag fortsætter selvom pegeren forlader handlet
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
    // Start panel-drag (fra højre gutter eller venstre reveal-tab)
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
    // Opdater panelposition under drag
    if (!dragging) return;
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    const dx = e.clientX - drag.current.startX;
    setPanelX(clamp(drag.current.panelAtStart + dx));
  };
  const onUp = () => {
    // Afslut drag: beslutter åben/lukket ud fra swipe-distance eller midtpunkt
    if (!dragging) return;
    const dx = drag.current ? drag.current.panelAtStart - panelX : 0;
    if (-dx < -minSwipe) setPanelX(-width());
    else if (-dx > minSwipe) setPanelX(0);
    else setPanelX(Math.abs(panelX) > width() / 2 ? -width() : 0);
    setDragging(false);
    detachWindowDrag();
  };
  const onCancel = () => {
    // Annuler drag
    setDragging(false);
    detachWindowDrag();
  };

  // Mål slides højde så højre drag-gutter starter under billederne
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

  // Hent hotspots én gang ved mount (getDocs)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hotspotsSnap = await getDocs(collection(db, "hotspots"));
        const hotspotsList = hotspotsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() || {}),
        }));
        if (!cancelled) setHotspots(hotspotsList);
      } catch (err) {
        console.error("Failed to load hotspots", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ingen "tap-to-reveal" — reveal-handle er altid tilgængelig når panelet
  // er skjult.

  // Lyt efter beskeder fra iframe (hotspot-klik). Åbner PostSildeOp og sætter
  // valgt hotspot når kortet sender `hotspotClick`.
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

  // Opdater aktivt slide baseret på horisontal scroll
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
  }, [slides.length]);

  // Live-opdateringer: abonner på `posts` via onSnapshot. Mapper snapshot til
  // en liste af post-objekter (konverterer timestamp til Date) og rydder
  // op på unmount via unsubscribe.
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
        setLoadingPosts(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filtrer hotspots efter valgt sport og tæl post-antal per hotspot. Sorter
  // resultater efter antal opslag, så mest aktive kommer først.
  useEffect(() => {
    // Count posts per hotspot for the selected sport
    const postCountByHotspot = {};
    const relevantPosts = selectedSport
      ? posts.filter((post) => post.sport === selectedSport)
      : posts;

    relevantPosts.forEach((post) => {
      if (post.hotspotId) {
        postCountByHotspot[post.hotspotId] =
          (postCountByHotspot[post.hotspotId] || 0) + 1;
      }
    });

    // Filter hotspots by sport if selected
    let filtered = hotspots;
    if (selectedSport) {
      filtered = hotspots.filter((hotspot) => {
        const sportsgren = hotspot.sportsgren || hotspot.sports || [];
        return Array.isArray(sportsgren) && sportsgren.includes(selectedSport);
      });
    }

    // Add post count to each hotspot
    const hotspotsWithCount = filtered.map((hotspot) => ({
      ...hotspot,
      postCount: postCountByHotspot[hotspot.id] || 0,
    }));

    // Sort by post count descending, then by name
    hotspotsWithCount.sort((a, b) => {
      if (b.postCount !== a.postCount) {
        return b.postCount - a.postCount;
      }
      return (a.name || a.id || "").localeCompare(b.name || b.id || "");
    });

    setFilteredHotspots(hotspotsWithCount);
  }, [hotspots, posts, selectedSport]);

  // Afled listen af posts til `PostSildeOp` ud fra valgt sport og valgt
  // hotspot.
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

  // Desktop: træk-for-scroll for karussellen (touch håndteres nativt).
  const onCarDown = (e) => {
    // For touch, let the browser handle native scroll + inertia + snap
    if (e.pointerType === "touch") {
      setSliderInteracting(true);
      return; // do not capture or preventDefault for touch
    }
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
    // track last movement for velocity
    carDrag.current.vx = 0;
    carDrag.current.lastX = e.clientX;
    carDrag.current.lastT = performance.now();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Drag-to-scroll for mouse
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
    // velocity estimate for mouse drags
    const now = performance.now();
    const dt = now - (carDrag.current.lastT || now);
    const dxStep = e.clientX - (carDrag.current.lastX || e.clientX);
    if (dt > 0) carDrag.current.vx = dxStep / dt; // px per ms
    carDrag.current.lastX = e.clientX;
    carDrag.current.lastT = now;
  };
  const onCarUp = (e) => {
    // If it was a touch interaction, let native snap finish
    if (e && e.pointerType === "touch") {
      setSliderInteracting(false);
      return;
    }
    if (!carDrag.current.active) {
      setSliderInteracting(false);
      return;
    }
    e.stopPropagation();
    const el = slidesRef.current;
    if (el) {
      const w = el.clientWidth || 1;
      const step = w + GAP;
      const pos = el.scrollLeft;
      const max = slides.length - 1;
      // Use velocity to bias toward next/prev on fast flicks
      const v = carDrag.current.vx || 0; // px/ms; sign indicates direction
      let idx = Math.round(pos / step);
      const FLICK_THRESHOLD = 0.5; // px/ms ~ quick drag
      if (Math.abs(v) > FLICK_THRESHOLD) {
        idx += v > 0 ? -1 : 1; // v>0 means moving left -> next slide to the right visually
      }
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

  // Wheel/trackpad: hijack horisontal scroll (non-passive) for bedre UX. Snap
  // til nærmeste slide efter inaktivitet.
  useEffect(() => {
    const el = slidesRef.current;
    if (!el) return;
    let snapTimer = 0;
    const onWheel = (e) => {
      // Only hijack when the intent is horizontal (or shift+scroll)
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      if (!horizontal) return; // let page scroll vertically
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {}
      const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY; // fallback for devices that emit deltaY
      el.scrollLeft += dx;
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const w = el.clientWidth || 1;
        const step = w + GAP;
        const idxMax = slides.length - 1;
        let idx = Math.round(el.scrollLeft / step);
        if (idx < 0) idx = 0;
        if (idx > idxMax) idx = idxMax;
        el.scrollTo({ left: idx * step, behavior: "smooth" });
        setActiveSlide(idx);
      }, 80);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (snapTimer) clearTimeout(snapTimer);
    };
  }, [GAP, slides.length]);

  // Beregn venstre position for reveal-tab så den følger panelkanten når
  // panelet er skjult.
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
        src={`${import.meta.env.BASE_URL}MapAnker.html`}
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
                        src="img/basketball-white.png"
                        alt="Basketball"
                        className="filter-icon-default"
                      />
                      <img
                        src="img/basketball-black.png"
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
                        src="img/volley-white.png"
                        alt="Volleyball"
                        className="filter-icon-default"
                      />
                      <img
                        src="img/volley-black.png"
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
                        src="img/fodbold-white.png"
                        alt="Fodbold"
                        className="filter-icon-default"
                      />
                      <img
                        src="img/fodbold-black.png"
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
                        src="img/tennis-white.png"
                        alt="Tennis"
                        className="filter-icon-default"
                      />
                      <img
                        src="img/tennis-black.png"
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
          {loadingPosts && hotspots.length === 0 ? (
            <div className="tm-muted">Indlæser...</div>
          ) : filteredHotspots.length === 0 ? (
            <div className="tm-muted">
              Ingen lokationer for den valgte sportsgren.
            </div>
          ) : (
            <div className="tm-location-list">
              {filteredHotspots.map((hotspot) => (
                <article
                  key={hotspot.id}
                  className="tm-location-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Fokusér ${
                    hotspot.name ||
                    hotspot.title ||
                    hotspot.navn ||
                    hotspot.placeName ||
                    hotspot.id ||
                    "lokation"
                  } på kortet`}
                  onClick={() => {
                    focusHotspot(
                      hotspot.id ||
                        hotspot.name ||
                        hotspot.title ||
                        hotspot.navn ||
                        hotspot.placeName ||
                        ""
                    );
                    // Slide panel out so the map is fully visible
                    setSheetOpen(false);
                    setPanelX(-width());
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      focusHotspot(
                        hotspot.id ||
                          hotspot.name ||
                          hotspot.title ||
                          hotspot.navn ||
                          hotspot.placeName ||
                          ""
                      );
                      setSheetOpen(false);
                      setPanelX(-width());
                    }
                  }}
                >
                  <div className="tm-location-image-wrapper">
                    <img
                      src={getLocationImage(hotspot)}
                      alt={
                        hotspot.name ||
                        hotspot.title ||
                        hotspot.navn ||
                        hotspot.placeName ||
                        hotspot.id ||
                        "Location"
                      }
                      className="tm-location-image"
                    />
                    <div className="tm-location-overlay">
                      <div className="tm-loc-active">
                        {Array.isArray(hotspot.activeplayers)
                          ? hotspot.activeplayers.length
                          : 0}{" "}
                        aktive
                      </div>
                      <h2 className="tm-location-name">
                        {hotspot.name ||
                          hotspot.title ||
                          hotspot.navn ||
                          hotspot.placeName ||
                          hotspot.id ||
                          "Unavngivet"}
                      </h2>
                      <div className="tm-loc-posts">
                        {hotspot.postCount || 0} opslag
                      </div>
                    </div>
                  </div>
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
      <PostSlideOp
        open={isHidden() && sheetOpen}
        onClose={() => {
          console.log(
            "PostSlideOp onClose called - setting sheetOpen to false"
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
