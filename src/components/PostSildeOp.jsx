/**
 * PostSildeOp - Google Maps Style Bottom Sheet Component
 *
 * En avanceret bottom sheet komponent der opfører sig præcis som Google Maps.
 * Inkluderer drag funktionalitet, snap positioner, og smart scrolling.
 *
 * Features:
 * - Drag to resize (Google Maps style)
 * - Three snap positions (collapsed, peek, full)
 * - Smart content scrolling when at top
 * - Touch optimized for mobile
 * - Sports activities display
 *
 * @param {boolean} open - Om bottom sheet er åben
 * @param {function} onClose - Funktion der kaldes når sheet lukkes
 * @param {number} initialHeight - Start højde i pixels (default: 180)
 * @param {number} maxHeightPercent - Max højde som procent af skærm (default: 100)
 * @param {ReactNode} header - Header indhold (f.eks. "DOKK1")
 * @param {ReactNode} children - Hovedindhold
 */
import { useCallback, useEffect, useRef, useState } from "react";
// Firebase imports for Firestore data
import { db } from "../assets/firebase"; // Firebase config (firestore)
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore"; // Firestore operations
import "../Styling/PostSildeOp.css";

export default function PostSildeOp({
  open = false, // Om bottom sheet er åben
  onClose, // Funktion der kaldes når sheet lukkes
  initialHeight = 180, // Start højde i pixels - collapsed state
  maxHeightPercent = 100, // Max højde som procent af skærm
  header, // Header indhold (f.eks. "DOKK1")
  children, // Hovedindhold
}) {
  // ========================================
  // REFS - DOM elementer og drag state
  // ========================================
  const containerRef = useRef(null); // Overlay container - dækker hele skærmen
  const sheetRef = useRef(null); // Bottom sheet element - selve den trækbare del
  const startYRef = useRef(0); // Start Y position ved drag - hvor brugeren startede at trække
  const startHeightRef = useRef(0); // Start højde ved drag - sheet højde da drag startede

  // ========================================
  // STATE - Sheet højde og drag status
  // ========================================
  const [height, setHeight] = useState(initialHeight); // Aktuel højde af bottom sheet
  const [isDragging, setIsDragging] = useState(false); // Om brugeren trækker i sheet lige nu
  const [isAtTop, setIsAtTop] = useState(false); // Om sheet er helt oppe (for scrolling)

  // State for stats interactions - dynamisk baseret på post IDs
  const [interestedStates, setInterestedStates] = useState({});
  const [participatingStates, setParticipatingStates] = useState({});

  // State for user data - Firebase integration (fjernet da vi bruger post.userName direkte)
  // const [currentUser, setCurrentUser] = useState(null); // Firebase auth bruger objekt
  // const [userProfile, setUserProfile] = useState(null); // Firestore profil data (username, email, etc.)

  // State for posts data - Firestore integration
  const [posts, setPosts] = useState([]); // Array af posts fra Firestore
  const [loading, setLoading] = useState(true); // Loading state for posts

  // Base counts for each post - dynamisk baseret på post data
  const getBaseCounts = (postId) => {
    // Særlig case for "active" pynt opslag
    if (postId === "active") {
      return {
        interested: 2,
        participating: 3,
      };
    }

    // Generer tilfældige tal baseret på post ID for konsistens
    const seed = postId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      interested: (seed % 5) + 1, // 1-5 interesserede
      participating: (seed % 4) + 2, // 2-5 deltagere
    };
  };

  // ========================================
  // CLICK HANDLERS FOR STATS
  // ========================================

  const handleInterestedClick = (cardType) => {
    setInterestedStates((prev) => ({
      ...prev,
      [cardType]: !prev[cardType],
    }));
  };

  const handleParticipatingClick = (cardType) => {
    setParticipatingStates((prev) => ({
      ...prev,
      [cardType]: !prev[cardType],
    }));
  };

  // ========================================
  // UTILITY FUNCTIONS - Hjælpefunktioner
  // ========================================

  /**
   * Formaterer tid til HH:MM format
   * @param {string} timeString - Tid som string (f.eks. "17:30")
   * @returns {string} Formateret tid
   */
  const formatTime = (timeString) => {
    if (!timeString) return "";
    // Hvis det allerede er i HH:MM format, return det
    if (timeString.includes(":")) return timeString;
    // Ellers prøv at parse det som timestamp
    return timeString;
  };

  // formatTimestamp funktion fjernet da vi bruger formatTime i stedet

  // ========================================
  // DYNAMIC COUNT CALCULATIONS - Beregner tal baseret på bruger interaktion
  // ========================================

  /**
   * Beregner antal interesserede baseret på brugerens klik
   * @param {string} postId - Post ID fra Firestore
   * @returns {number} Antal interesserede (base + 1 hvis bruger har klikket)
   */
  const getInterestedCount = (postId) => {
    const base = getBaseCounts(postId).interested;
    return interestedStates[postId] ? base + 1 : base;
  };

  /**
   * Beregner antal deltagere baseret på brugerens klik
   * @param {string} postId - Post ID fra Firestore
   * @returns {number} Antal deltagere (base + 1 hvis bruger har klikket)
   */
  const getParticipatingCount = (postId) => {
    const base = getBaseCounts(postId).participating;
    return participatingStates[postId] ? base + 1 : base;
  };

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  /**
   * Utility funktion til at begrænse værdi mellem min og max
   * Eksempel: clamp(150, 100, 200) = 150, clamp(50, 100, 200) = 100, clamp(250, 100, 200) = 200
   * @param {number} value - Værdien der skal begrænses
   * @param {number} min - Minimum værdi
   * @param {number} max - Maksimum værdi
   * @returns {number} Begrænset værdi
   */
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /**
   * Beregner maksimal højde baseret på skærmstørrelse
   * Hvis skærmen er 1000px høj og maxHeightPercent er 100, returnerer den 1000px
   * @returns {number} Maksimal højde i pixels
   */
  const getMaxHeight = useCallback(() => {
    const viewportH = window.innerHeight; // Hent skærmens højde
    return Math.round((maxHeightPercent / 100) * viewportH); // Beregn max højde som procent
  }, [maxHeightPercent]);

  // Konstant for minimum højde når collapsed (peek) - større for bedre synlighed
  const minHeight = 180;

  // ========================================
  // EFFECTS - Lifecycle og event handling
  // ========================================

  /**
   * Når sheet åbnes, sæt højde til mellem min og max
   * Dette sikrer at sheet altid er synlig når den åbnes
   */
  useEffect(() => {
    if (!open) return; // Hvis sheet ikke er åben, gør intet
    const maxH = getMaxHeight(); // Hent maksimal højde
    setHeight((h) => clamp(h || initialHeight, minHeight, maxH)); // Sæt højde mellem min og max
  }, [open, getMaxHeight, initialHeight]);

  /**
   * Detekter når sheet er helt oppe (for scrolling funktionalitet)
   * Når sheet er 95% af max højde, betragtes den som "helt oppe"
   */
  useEffect(() => {
    const maxH = getMaxHeight();
    const threshold = maxH * 0.95; // 95% af max højde
    setIsAtTop(height >= threshold);
  }, [height, getMaxHeight]);

  /**
   * Lytter efter Escape tast for at lukke sheet
   * Brugeren kan trykke Escape for at lukke sheet'en
   */
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return; // Hvis sheet ikke er åben, gør intet
      if (e.key === "Escape") onClose && onClose(); // Hvis Escape trykkes, luk sheet
    };
    window.addEventListener("keydown", onKey); // Tilføj event listener
    return () => window.removeEventListener("keydown", onKey); // Fjern event listener når komponenten unmountes
  }, [open, onClose]);

  // Firebase Authentication Listener fjernet da vi bruger post.userName direkte fra Firestore

  /**
   * Firestore Posts Listener - Real-time Database Integration
   *
   * Dette useEffect hook håndterer al kommunikation med Firestore database
   * og sikrer at posts opdateres i real-time når brugere opretter nye opslag.
   *
   * Hvordan det virker:
   * 1. Opretter en query der henter posts fra "posts" collection
   * 2. Sorterer posts efter timestamp (nyeste først)
   * 3. Begrænser til 10 nyeste posts for performance
   * 4. Lytter efter ændringer i real-time med onSnapshot
   * 5. Opdaterer React state når nye data kommer
   * 6. Rydder op når komponenten unmountes
   *
   * Real-time betyder: Når en bruger opretter et nyt post i Opret_post komponenten,
   * så dukker det automatisk op i PostSildeOp uden at man skal refreshe siden!
   */
  useEffect(() => {
    // Vis loading state mens data hentes
    setLoading(true);

    // ========================================
    // OPRET FIRESTORE QUERY
    // ========================================

    // Opret query for at hente posts sorteret efter timestamp
    // Dette er som at sige til Firestore: "Giv mig posts fra 'posts' collection,
    // sorteret efter timestamp (nyeste først), og begræns til 10 styk"
    const postsQuery = query(
      collection(db, "posts"), // Hent fra "posts" collection
      orderBy("timestamp", "desc"), // Sorter efter timestamp (nyeste først)
      limit(10) // Begræns til 10 nyeste posts (for performance)
    );

    // ========================================
    // REAL-TIME LISTENER SETUP
    // ========================================

    // onSnapshot lytter efter ændringer i Firestore i real-time
    // Dette betyder at hver gang nogen opretter, opdaterer eller sletter et post,
    // så får vi automatisk en opdatering her i komponenten
    const unsubscribe = onSnapshot(
      postsQuery, // Query vi oprettede ovenfor
      (snapshot) => {
        // Callback der køres når data ændres
        // ========================================
        // DATAFORMATERING
        // ========================================

        // Konverter Firestore dokumenter til JavaScript objekter
        // snapshot.docs er et array af alle dokumenter der matcher vores query
        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id, // Firestore dokument ID (unik identifikator)
          ...doc.data(), // Alle felter fra dokumentet (title, details, time, etc.)
          // Konverter Firestore timestamp til JavaScript Date objekt
          // Dette gør det nemmere at arbejde med datoer i JavaScript
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));

        // ========================================
        // STATE OPDATERING
        // ========================================

        // Opdater React state med de nye posts
        // Dette trigger en re-render af komponenten med de nye data
        setPosts(postsData);
        setLoading(false); // Skjul loading state
      },
      (error) => {
        // Error callback hvis noget går galt
        console.error("Fejl ved hentning af posts:", error);
        setLoading(false); // Skjul loading state selv ved fejl
      }
    );

    // ========================================
    // CLEANUP FUNCTION
    // ========================================

    // Cleanup function - fjern listener når komponenten unmountes
    // Dette forhindrer memory leaks og unødvendige database calls
    // Når brugeren navigerer væk fra siden, så stopper vi med at lytte
    return () => unsubscribe();
  }, []); // Tom dependency array = kør kun ved første load (ikke ved re-render)

  // ========================================
  // DRAG FUNCTIONS - Drag funktionalitet
  // ========================================

  /**
   * Starter drag operation - gemmer start position og højde
   * Kaldes når brugeren begynder at trække i sheet'en
   * @param {number} clientY - Y position hvor drag startede
   */
  const beginDrag = (clientY) => {
    setIsDragging(true); // Marker at vi nu trækker
    startYRef.current = clientY; // Gem hvor brugeren startede at trække (Y position)
    startHeightRef.current = height; // Gem sheet højde da drag startede
    document.body.style.userSelect = "none"; // Forhindrer tekst markering under drag

    // Google Maps style: forhindrer zoom og scrolling under drag
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  };

  /**
   * Håndterer start af drag - tillad drag fra hele bottom sheet
   * Kaldes når brugeren trykker/trykker på sheet'en
   * @param {PointerEvent} e - Pointer event (mouse eller touch)
   */
  const onPointerDown = (e) => {
    // Tillad drag fra hele bottom sheet, ikke kun handle området
    if (!e.target.closest(".psu-sheet")) return; // Hvis ikke klik på sheet, gør intet

    // Hvis sheet er helt oppe og brugeren klikker på indhold, tillad scrolling
    if (isAtTop && e.target.closest(".psu-content")) {
      return; // Tillad normal scrolling i indhold
    }

    // Forhindrer zoom på mobile
    e.preventDefault(); // Forhindrer standard touch behavior
    e.stopPropagation(); // Forhindrer event bubbling

    // Forhindrer double-tap zoom
    if (e.touches && e.touches.length > 1) {
      // Hvis flere fingre rører skærmen
      e.preventDefault(); // Forhindrer zoom
      return; // Stop drag operation
    }

    const clientY = e.touches ? e.touches[0].clientY : e.clientY; // Hent Y position (touch eller mouse)
    beginDrag(clientY); // Start drag operation
  };

  /**
   * Håndterer drag bevægelse - følger fingeren præcis i real-time
   * Kaldes når brugeren trækker fingeren/musen mens de holder nede
   * @param {PointerEvent} e - Pointer event (mouse eller touch)
   */
  const onPointerMove = (e) => {
    if (!isDragging) return; // Hvis vi ikke trækker, gør intet

    const clientY = e.touches ? e.touches[0].clientY : e.clientY; // Hent nuværende Y position
    const delta = startYRef.current - clientY; // Beregn hvor meget brugeren har bevæget sig
    // Positiv delta = træk op (øg højde), negativ delta = træk ned (mindsk højde)
    const maxH = getMaxHeight(); // Hent maksimal højde

    // Direkte følsomhed - følger fingeren præcis
    const newHeight = clamp(
      startHeightRef.current + delta, // Start højde + direkte bevægelse
      minHeight, // Minimum højde (collapsed)
      maxH // Maksimal højde (fuldt åben)
    );

    // Altid preventDefault for ultra smooth drag
    e.preventDefault(); // Forhindrer scrolling
    e.stopPropagation(); // Forhindrer event bubbling

    // Direkte opdatering - ingen requestAnimationFrame delay
    setHeight(newHeight); // Opdater sheet højde øjeblikkeligt
  };

  /**
   * Håndterer slutning af drag - snap til tre positioner som Google Maps
   * Kaldes når brugeren slipper fingeren/musen
   * Implementerer Google Maps style snap funktionalitet
   */
  const onPointerUp = () => {
    if (!isDragging) return; // Hvis vi ikke trækker, gør intet
    setIsDragging(false); // Marker at vi ikke længere trækker
    document.body.style.userSelect = ""; // Gendan tekst markering

    // Google Maps style: gendan normal scrolling
    document.body.style.overflow = "";
    document.body.style.touchAction = "";

    // Google Maps style: tre positioner - collapsed, peek, og fuldt åben
    const maxH = getMaxHeight(); // Hent maksimal højde
    const current = height; // Nuværende højde

    // Beregn tre snap positioner som Google Maps
    const collapsedHeight = minHeight; // 180px - kun handle synlig
    const peekHeight = Math.min(300, maxH * 0.4); // 40% af max eller 300px - delvis synlig
    const fullHeight = maxH; // 100% - fuldt åben

    // Bestem hvilken position sheet skal snappe til baseret på nuværende højde
    let target;
    if (current < (collapsedHeight + peekHeight) / 2) {
      target = collapsedHeight; // Snap til collapsed
    } else if (current < (peekHeight + fullHeight) / 2) {
      target = peekHeight; // Snap til peek
    } else {
      target = fullHeight; // Snap til fuldt åben
    }

    // Smooth snap animation med Google Maps timing
    requestAnimationFrame(() => {
      setHeight(target); // Snap til den valgte position
    });
  };

  /**
   * Tilføjer event listeners for mouse og touch events
   * Dette sikrer at drag funktionaliteten virker både med mus og touch
   * iPhone optimerede event listeners med capture mode
   */
  useEffect(() => {
    // iPhone optimerede event listeners
    window.addEventListener("mousemove", onPointerMove); // Mus bevægelse
    window.addEventListener("mouseup", onPointerUp); // Mus slippes
    window.addEventListener("touchmove", onPointerMove, {
      passive: false, // Tillad preventDefault
      capture: true, // Fanger events tidligt
    });
    window.addEventListener("touchend", onPointerUp, {
      passive: false, // Tillad preventDefault
      capture: true, // Fanger events tidligt
    });
    return () => {
      // Cleanup: fjern alle event listeners når komponenten unmountes
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchmove", onPointerMove, { capture: true });
      window.removeEventListener("touchend", onPointerUp, { capture: true });
    };
  });

  // ========================================
  // RENDER - JSX return
  // ========================================

  // Hvis sheet ikke er åben, render intet
  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="psu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Detaljer"
    >
      {/* Backdrop - klik for at lukke */}
      <button
        className="psu-backdrop"
        aria-label="Luk"
        onClick={() => onClose && onClose()}
      />

      {/* Bottom sheet med dynamisk højde - hele sheet er draggable */}
      <div
        ref={sheetRef}
        className={`psu-sheet ${isDragging ? "dragging" : ""} ${
          isAtTop ? "at-top" : ""
        }`}
        style={{ height }}
        onMouseDown={onPointerDown}
        onTouchStart={onPointerDown}
        role="button"
        aria-label="Træk for at udvide"
        tabIndex={0}
      >
        {/* Drag handle - visuelt element */}
        <div className="psu-handleArea">
          <div className="psu-handle" />
        </div>

        {/* Header indhold (f.eks. "DOKK1") */}
        {header ? (
          <div className="psu-header">
            <div className="psu-header-content">
              <span className="psu-header-title">{header}</span>
              <img
                src="/img/plus.png"
                alt="Tilføj"
                className="psu-plus-image"
              />
            </div>
          </div>
        ) : null}

        {/* Hovedindhold - ikke draggable */}
        <div className="psu-content">
          {/* Sportsgrene sektion */}
          <div className="psu-sports-section">
            <div className="psu-sports-title">Sportsgrene</div>
            <div className="psu-sports-icons">
              <img
                src="/img/basketball-white.png"
                alt="Basketball"
                className="psu-sport-icon"
              />
              <img
                src="/img/fodbold-white.png"
                alt="Fodbold"
                className="psu-sport-icon"
              />
            </div>
          </div>

          {/* Aktiv nu kort - Pynt opslag */}
          <div className="psu-activity-card active">
            <div className="psu-card-header active">
              <span>Aktiv nu</span>
              <div className="psu-active-dot"></div>
            </div>
            <div className="psu-card-content">
              <div className="psu-card-title orange">Vi er klar nu her</div>
              <div className="psu-card-description">
                Vi er nogle gutter der gerne vil spille fodbold, Kom og vær med
                ;)
              </div>
              <div className="psu-card-tags">
                <span className="psu-tag">#Begynder</span>
              </div>
              {/* Bruger navn - statisk pynt */}
              <div className="psu-card-user">Anonym_ugle</div>
              <div className="psu-card-stats">
                <div className="psu-stats-container">
                  <div className="psu-stat-element">
                    <div
                      className={`psu-stat-square star ${
                        interestedStates.active ? "active" : ""
                      }`}
                      onClick={() => handleInterestedClick("active")}
                      style={{ cursor: "pointer" }}
                    >
                      {interestedStates.active && (
                        <img
                          src="/img/star-orange.png"
                          alt="Star"
                          className="psu-stat-icon-large"
                        />
                      )}
                    </div>
                    <div className="psu-stat-text">
                      {getInterestedCount("active")} interesseret
                    </div>
                  </div>
                  <div className="psu-stat-element">
                    <div
                      className={`psu-stat-square check ${
                        participatingStates.active ? "active" : ""
                      }`}
                      onClick={() => handleParticipatingClick("active")}
                      style={{ cursor: "pointer" }}
                    >
                      {participatingStates.active && (
                        <img
                          src="/img/check-orange.png"
                          alt="Check"
                          className="psu-stat-icon-large"
                        />
                      )}
                    </div>
                    <div className="psu-stat-text">
                      {getParticipatingCount("active")} deltager
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="psu-loading">
              <div className="psu-loading-text">Henter posts...</div>
            </div>
          )}

          {/* Dynamiske posts fra Firestore */}
          {!loading && posts.length === 0 && (
            <div className="psu-no-posts">
              <div className="psu-no-posts-text">Ingen posts endnu</div>
              <div className="psu-no-posts-subtitle">
                Opret det første opslag!
              </div>
            </div>
          )}

          {/* Render posts fra Firestore */}
          {!loading &&
            posts.map((post) => {
              // Bestem om posten er aktiv (inden for 2 timer)
              const now = new Date();
              const postTime = new Date(post.timestamp);
              const timeDiff = now - postTime;
              const isActive = timeDiff < 2 * 60 * 60 * 1000; // 2 timer i millisekunder

              return (
                <div
                  key={post.id}
                  className={`psu-activity-card ${isActive ? "active" : ""}`}
                >
                  <div
                    className={`psu-card-header ${isActive ? "active" : ""}`}
                  >
                    <span>{isActive ? "Aktiv nu" : formatTime(post.time)}</span>
                    {isActive && <div className="psu-active-dot"></div>}
                  </div>
                  <div className="psu-card-content">
                    <div className="psu-card-title orange">{post.title}</div>
                    <div className="psu-card-description">{post.details}</div>
                    <div className="psu-card-tags">
                      <span className="psu-tag">#{post.sport}</span>
                    </div>
                    {/* Bruger navn fra Firestore */}
                    <div className="psu-card-user">
                      {post.userName || "Anonym_ugle"}
                    </div>
                    <div className="psu-card-stats">
                      <div className="psu-stats-container">
                        <div className="psu-stat-element">
                          <div
                            className={`psu-stat-square star ${
                              interestedStates[post.id] ? "active" : ""
                            }`}
                            onClick={() => handleInterestedClick(post.id)}
                            style={{ cursor: "pointer" }}
                          >
                            {interestedStates[post.id] && (
                              <img
                                src="/img/star-orange.png"
                                alt="Star"
                                className="psu-stat-icon-large"
                              />
                            )}
                          </div>
                          <div className="psu-stat-text">
                            {getInterestedCount(post.id)} interesseret
                          </div>
                        </div>
                        <div className="psu-stat-element">
                          <div
                            className={`psu-stat-square check ${
                              participatingStates[post.id] ? "active" : ""
                            }`}
                            onClick={() => handleParticipatingClick(post.id)}
                            style={{ cursor: "pointer" }}
                          >
                            {participatingStates[post.id] && (
                              <img
                                src="/img/check-orange.png"
                                alt="Check"
                                className="psu-stat-icon-large"
                              />
                            )}
                          </div>
                          <div className="psu-stat-text">
                            {getParticipatingCount(post.id)} deltager
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {children}
        </div>
      </div>
    </div>
  );
}
