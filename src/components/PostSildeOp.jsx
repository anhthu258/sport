/**
 * ========================================
 * POSTSILDEOP - GOOGLE MAPS STYLE BOTTOM SHEET
 * ========================================
 *
 * Dette er en avanceret bottom sheet komponent der opfører sig præcis som Google Maps.
 * Den kan trækkes op og ned, og har tre forskellige positioner: collapsed, peek og fuldt åben.
 *
 * HVAD GØR DEN?
 * - Viser posts fra Firestore database i real-time
 * - Kan trækkes op og ned med fingeren (som Google Maps)
 * - Har tre snap positioner: collapsed (lille), peek (mellem), full (stor)
 * - Viser sportsgrene baseret på aktuelle posts
 * - Tillader brugere at klikke på "interesseret" og "deltager" knapper
 *
 * HVOR BRUGES DEN?
 * - Når brugeren klikker på et hotspot på kortet
 * - Viser alle posts for det valgte område
 * - Giver mulighed for at oprette nye posts
 *
 * @param {boolean} open - Om bottom sheet er åben (true/false)
 * @param {function} onClose - Funktion der kaldes når sheet lukkes
 * @param {number} initialHeight - Start højde i pixels (standard: 180px)
 * @param {number} maxHeightPercent - Max højde som procent af skærm (standard: 100%)
 * @param {boolean} disableBackdropClose - Hvis true, lukker ikke ved klik udenfor
 * @param {Array} externalPosts - Eksterne posts (hvis ikke givet, hentes fra Firestore)
 * @param {boolean} externalLoading - Loading state for eksterne posts
 * @param {string} hotspotName - Navn på det valgte hotspot (f.eks. "DOKK1")
 */
// ========================================
// IMPORTS - Hvad vi har brug for fra React og Firebase
// ========================================
import { useCallback, useEffect, useRef, useState } from "react";

// Firebase imports - til at hente data fra database
import { db } from "../assets/firebase"; // Firebase config (firestore)
import {
  collection, // Hent en samling af dokumenter
  onSnapshot, // Lyt efter ændringer i real-time
  query, // Opret en søgning
  orderBy, // Sorter resultater
  limit, // Begræns antal resultater
} from "firebase/firestore"; // Firestore operations

// CSS styling for komponenten
import "../Styling/PostSildeOp.css";
import "../pages/Opret_post.jsx";

// ========================================
// KOMPONENT DEFINITION - Hovedfunktionen
// ========================================
export default function PostSildeOp({
  open = false, // Om bottom sheet er åben (true/false)
  onClose, // Funktion der kaldes når sheet lukkes
  initialHeight = 180, // Start højde i pixels - collapsed state
  maxHeightPercent = 100, // Max højde som procent af skærm
  disableBackdropClose = false, // Hvis true, klik udenfor lukker ikke og klik passerer igennem til baggrunden
  externalPosts = null, // Eksterne posts (hvis ikke givet, hentes fra Firestore)
  externalLoading = false, // Loading state for eksterne posts
  hotspotName = "Vælg et punkt", // Navn på det valgte hotspot
}) {
  // ========================================
  // REFS - DOM elementer og drag state
  // ========================================
  // Refs er som "referencer" til HTML elementer - vi bruger dem til at få adgang til DOM elementer
  const containerRef = useRef(null); // Overlay container - dækker hele skærmen
  const sheetRef = useRef(null); // Bottom sheet element - selve den trækbare del
  const startYRef = useRef(0); // Start Y position ved drag - hvor brugeren startede at trække
  const startHeightRef = useRef(0); // Start højde ved drag - sheet højde da drag startede

  // ========================================
  // STATE - Sheet højde og drag status
  // ========================================
  // State er data der kan ændre sig og får komponenten til at re-rendere når det ændres
  const [height, setHeight] = useState(initialHeight); // Aktuel højde af bottom sheet
  const [isDragging, setIsDragging] = useState(false); // Om brugeren trækker i sheet lige nu
  const [isAtTop, setIsAtTop] = useState(false); // Om sheet er helt oppe (for scrolling)

  // State for stats interactions - dynamisk baseret på post IDs
  // Disse holder styr på hvilke posts brugeren har klikket på
  const [interestedStates, setInterestedStates] = useState({}); // Hvilke posts brugeren er interesseret i
  const [participatingStates, setParticipatingStates] = useState({}); // Hvilke posts brugeren deltager i

  // State for posts data - Firestore integration
  // Disse holder styr på posts fra databasen
  const [internalPosts, setInternalPosts] = useState([]); // Array af posts fra Firestore
  const [internalLoading, setInternalLoading] = useState(true); // Loading state for posts

  // Brug eksterne posts hvis givet, ellers interne posts
  // Dette gør komponenten fleksibel - den kan vise posts fra forskellige kilder
  const posts = externalPosts !== null ? externalPosts : internalPosts;
  const loading = externalPosts !== null ? externalLoading : internalLoading;

  // ========================================
  // UTILITY FUNCTIONS - Hjælpefunktioner
  // ========================================

  /**
   * Genererer base counts for hver post - dynamisk baseret på post data
   * Dette giver hver post et konsistent antal interesserede og deltagere
   * @param {string} postId - Post ID fra Firestore
   * @returns {object} Objekt med interested og participating counts
   */
  const getBaseCounts = (postId) => {
    // Særlig case for "active" pynt opslag
    if (postId === "active") {
      return {
        interested: 2,
        participating: 3,
      };
    }

    // Generer tilfældige tal baseret på post ID for konsistens
    // Dette sikrer at samme post altid får samme tal
    const seed = postId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      interested: (seed % 5) + 1, // 1-5 interesserede
      participating: (seed % 4) + 2, // 2-5 deltagere
    };
  };

  // ========================================
  // CLICK HANDLERS FOR STATS - Håndterer brugerens klik på knapper
  // ========================================

  /**
   * Håndterer klik på "interesseret" knappen
   * Toggler om brugeren er interesseret i posten
   * @param {string} cardType - Post ID (cardType er det samme som postId)
   */
  const handleInterestedClick = (cardType) => {
    setInterestedStates((prev) => ({
      ...prev,
      [cardType]: !prev[cardType], // Toggle: hvis true bliver false, hvis false bliver true
    }));
  };

  /**
   * Håndterer klik på "deltager" knappen
   * Toggler om brugeren deltager i posten
   * @param {string} cardType - Post ID (cardType er det samme som postId)
   */
  const handleParticipatingClick = (cardType) => {
    setParticipatingStates((prev) => ({
      ...prev,
      [cardType]: !prev[cardType], // Toggle: hvis true bliver false, hvis false bliver true
    }));
  };

  // ========================================
  // TIME FORMATTING FUNCTIONS - Formaterer tid
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

  // ========================================
  // DYNAMIC COUNT CALCULATIONS - Beregner tal baseret på bruger interaktion
  // ========================================

  /**
   * Beregner antal interesserede baseret på brugerens klik
   * Hvis brugeren har klikket på "interesseret", så tilføjes +1 til base count
   * @param {string} postId - Post ID fra Firestore
   * @returns {number} Antal interesserede (base + 1 hvis bruger har klikket)
   */
  const getInterestedCount = (postId) => {
    const base = getBaseCounts(postId).interested; // Hent base count (1-5)
    return interestedStates[postId] ? base + 1 : base; // Hvis bruger har klikket, tilføj +1
  };

  /**
   * Beregner antal deltagere baseret på brugerens klik
   * Hvis brugeren har klikket på "deltager", så tilføjes +1 til base count
   * @param {string} postId - Post ID fra Firestore
   * @returns {number} Antal deltagere (base + 1 hvis bruger har klikket)
   */
  const getParticipatingCount = (postId) => {
    const base = getBaseCounts(postId).participating; // Hent base count (2-5)
    return participatingStates[postId] ? base + 1 : base; // Hvis bruger har klikket, tilføj +1
  };

  // ========================================
  // MATH UTILITY FUNCTIONS - Matematiske hjælpefunktioner
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
  // useEffect hooks køres når komponenten renderes eller når bestemte værdier ændres

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
   * Sæt height til initialHeight når PostSildeOp åbnes
   * Dette sikrer at der er plads til at trække den ned
   */
  useEffect(() => {
    if (open) {
      setHeight(initialHeight); // Åbn i initialHeight så der er plads til at trække ned
    }
  }, [open, initialHeight]);

  /**
   * Detekter når sheet er helt oppe (for scrolling funktionalitet)
   * Når sheet er 95% af max højde, betragtes den som "helt oppe"
   */
  useEffect(() => {
    const maxH = getMaxHeight();
    const threshold = maxH * 0.95; // 95% af max højde
    setIsAtTop(height >= threshold);
  }, [height, getMaxHeight]);

  // ========================================
  // FIRESTORE DATABASE INTEGRATION - Real-time data fra Firebase
  // ========================================

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
    // Hvis der er givet eksterne posts, spring Firestore listener over
    if (externalPosts !== null) {
      setInternalLoading(false);
      return;
    }

    // Vis loading state mens data hentes
    setInternalLoading(true);

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
        setInternalPosts(postsData);
        setInternalLoading(false); // Skjul loading state
      },
      (error) => {
        // Error callback hvis noget går galt
        console.error("Fejl ved hentning af posts:", error);
        setInternalLoading(false); // Skjul loading state selv ved fejl
      }
    );

    // ========================================
    // CLEANUP FUNCTION
    // ========================================

    // Cleanup function - fjern listener når komponenten unmountes
    // Dette forhindrer memory leaks og unødvendige database calls
    // Når brugeren navigerer væk fra siden, så stopper vi med at lytte
    return () => unsubscribe();
  }, [externalPosts]); // Dependency på externalPosts - hvis den ændres, genstart listener

  // ========================================
  // DRAG FUNCTIONS - Drag funktionalitet (Google Maps style)
  // ========================================
  // Disse funktioner håndterer at brugeren kan trække bottom sheet op og ned

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
    if (!e.target.closest(".psu-sheet")) {
      return; // Hvis ikke klik på sheet, gør intet
    }

    // Hvis sheet er helt oppe og brugeren klikker på indhold, tillad scrolling
    if (isAtTop && e.target.closest(".psu-content")) {
      return; // Tillad normal scrolling i indhold
    }

    // Forhindrer event bubbling
    e.stopPropagation();

    // Forhindrer double-tap zoom og multi-touch
    if (e.touches && e.touches.length > 1) {
      // Hvis flere fingre rører skærmen
      return; // Stop drag operation
    }

    // Forhindrer default touch behavior for bedre drag
    try {
      e.preventDefault();
    } catch {
      // Ignore preventDefault errors
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

    // Forhindrer scrolling og event bubbling
    e.preventDefault(); // Forhindrer scrolling
    e.stopPropagation(); // Forhindrer event bubbling

    // Direkte opdatering - ingen requestAnimationFrame delay
    setHeight(newHeight); // Opdater sheet højde øjeblikkeligt

    // Visuel indikator når man trækker ned for at lukke
    const closeThreshold = 100; // Samme tærskel som i onPointerUp
    if (newHeight < closeThreshold) {
      // Sheet bliver mere transparent når man trækker ned for at lukke
      if (sheetRef.current) {
        sheetRef.current.style.opacity = Math.max(
          0.2,
          newHeight / closeThreshold
        );
      }
    } else {
      // Gendan normal opacity
      if (sheetRef.current) {
        sheetRef.current.style.opacity = "1";
      }
    }
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

    // Gendan normal opacity
    if (sheetRef.current) {
      sheetRef.current.style.opacity = "1";
    }

    // Google Maps style: tre positioner - collapsed, peek, og fuldt åben
    const maxH = getMaxHeight(); // Hent maksimal højde
    const current = height; // Nuværende højde

    // Beregn tre snap positioner som Google Maps
    const collapsedHeight = minHeight; // 180px - kun handle synlig
    const peekHeight = Math.min(300, maxH * 0.4); // 40% af max eller 300px - delvis synlig
    const fullHeight = maxH; // 100% - fuldt åben

    // Bestem hvilken position sheet skal snappe til baseret på nuværende højde
    let target;
    const closeThreshold = 100; // Luk hvis under 100px (meget nemmere på telefon)

    // Luk hvis trækket under 100px (meget nemmere på telefon)
    console.log(
      "Close check - current:",
      current,
      "closeThreshold:",
      closeThreshold
    );
    if (current < closeThreshold) {
      console.log("Closing PostSildeOp - height below threshold");
      onClose();
      return;
    } else if (current < (collapsedHeight + peekHeight) / 2) {
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
  // RENDER - JSX return (HTML der vises på skærmen)
  // ========================================
  // Her defineres hvad der skal vises på skærmen

  // Hvis sheet ikke er åben, render intet
  if (!open) return null;

  // Bestem om vi skal bruge pass-through mode (når collapsed)
  // Pass-through betyder at klik passerer igennem til baggrunden
  const isCollapsed = height <= minHeight;

  // I collapsed state skal backdrop stadig kunne lukke sheet'et
  const shouldAllowBackdropClose = !disableBackdropClose;

  return (
    <div
      ref={containerRef}
      className={`psu-overlay ${isCollapsed ? "psu-pass-through" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Detaljer"
    >
      {/* ======================================== */}
      {/* BACKDROP - Baggrund der kan lukke sheet */}
      {/* ======================================== */}
      {!shouldAllowBackdropClose ? (
        <div className="psu-backdrop psu-backdrop-pass" aria-hidden="true" />
      ) : (
        <button
          className={`psu-backdrop ${
            isCollapsed ? "psu-backdrop-collapsed" : ""
          }`}
          aria-label="Luk"
          onClick={() => onClose && onClose()}
        />
      )}

      {/* ======================================== */}
      {/* BOTTOM SHEET - Hovedkomponenten der kan trækkes */}
      {/* ======================================== */}
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
        {/* Drag handle indikator - den lille streg der viser man kan trække */}
        <div className="psu-drag-indicator">
          <div className="psu-handle"></div>
        </div>

        {/* ======================================== */}
        {/* HOVEDINDHOLD - Alt indhold i sheet'en */}
        {/* ======================================== */}
        <div className="psu-content">
          {/* ======================================== */}
          {/* OVERSKRIFT OG PLUS KNAP */}
          {/* ======================================== */}
          <div className="psu-title-section">
            <h2 className="psu-title">{hotspotName}</h2>
            <button
              className="psu-plus-button"
              onClick={() => {
                // Naviger til opret post side
                window.location.href = "/opretpost";
              }}
              aria-label="Tilføj post"
            >
              <span className="psu-plus-icon">+</span>
            </button>
          </div>

          {/* ======================================== */}
          {/* SPORTSGRENE SEKTION - Viser ikoner for aktuelle sportsgrene */}
          {/* ======================================== */}
          <div className="psu-sports-section">
            <div className="psu-sports-title">Sportsgrene</div>
            <div className="psu-sports-icons">
              {(() => {
                // Hent unikke sportsgrene fra posts (filtrerede posts for valgt hotspot)
                const now = new Date();
                const recentPosts = posts.filter((post) => {
                  // Håndter Firebase timestamp korrekt
                  const postTime = post.timestamp?.toDate
                    ? post.timestamp.toDate()
                    : new Date(post.timestamp);
                  const timeDiff = now - postTime;
                  return timeDiff < 24 * 60 * 60 * 1000; // 24 timer i millisekunder
                });

                const uniqueSports = [
                  ...new Set(
                    recentPosts.map((post) => post.sport).filter(Boolean)
                  ),
                ];

                // Mapping af sportsgrene til ikoner - opdateret til at matche de rigtige filnavne
                const sportIcons = {
                  Basketball: "/img/basketball-white.png",
                  Fodbold: "/img/fodbold-white.png",
                  Tennis: "/img/tennis-white.png",
                  Volleyball: "/img/volley-white.png", 
                  Badminton: "/img/badminton-white.png",
                  Padel: "/img/padel-white.png",
                  Squash: "/img/squash-white.png",
                  Håndbold: "/img/handbold-white.png",
                  Bordtennis: "/img/bordtennis-white.png",
                  Fitness: "/img/fitness-white.png",
                };

                // Hvis ingen posts, vis standard ikoner
                if (uniqueSports.length === 0) {
                  return (
                    <>
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
                    </>
                  );
                }

                // Vis ikoner for de faktiske sportsgrene
                return uniqueSports.map((sport, index) => (
                  <img
                    key={index}
                    src={sportIcons[sport] || "/img/sport-default-white.png"}
                    alt={sport}
                    className="psu-sport-icon"
                    title={sport}
                  />
                ));
              })()}
            </div>
          </div>

          {/* ======================================== */}
          {/* LOADING STATE - Viser mens data hentes */}
          {/* ======================================== */}
          {loading && (
            <div className="psu-loading">
              <div className="psu-loading-text">Henter posts...</div>
            </div>
          )}

          {/* ======================================== */}
          {/* NO POSTS STATE - Viser når der ikke er nogen posts */}
          {/* ======================================== */}
          {!loading && posts.length === 0 && (
            <div className="psu-no-posts">
              <div className="psu-no-posts-text">Ingen posts endnu</div>
              <div className="psu-no-posts-subtitle">
                Opret det første opslag!
              </div>
            </div>
          )}

          {/* ======================================== */}
          {/* POSTS LISTE - Viser alle posts fra Firestore */}
          {/* ======================================== */}
          {!loading &&
            posts
              .filter((post) => {
                // Filtrer posts der er under 24 timer gamle
                const now = new Date();
                // Håndter Firebase timestamp korrekt
                const postTime = post.timestamp?.toDate
                  ? post.timestamp.toDate()
                  : new Date(post.timestamp);
                const timeDiff = now - postTime;
                const isUnder24Hours = timeDiff < 24 * 60 * 60 * 1000; // 24 timer i millisekunder
                return isUnder24Hours;
              })
              .map((post) => {
                // ======================================== */}
                {
                  /* INDIVIDUEL POST CARD - Hver post får sin egen card */
                }
                {
                  /* ======================================== */
                }

                // Bestem om posten er aktiv (inden for 2 timer)
                const now = new Date();
                // Håndter Firebase timestamp korrekt
                const postTime = post.timestamp?.toDate
                  ? post.timestamp.toDate()
                  : new Date(post.timestamp);
                const timeDiff = now - postTime;
                const isActive = timeDiff < 2 * 60 * 60 * 1000; // 2 timer i millisekunder

                return (
                  <div
                    key={post.id}
                    className={`psu-activity-card ${isActive ? "active" : ""}`}
                  >
                    {/* Post header med tid/status */}
                    <div
                      className={`psu-card-header ${isActive ? "active" : ""}`}
                    >
                      <span>
                        {isActive ? "Aktiv nu" : formatTime(post.time)}
                      </span>
                      {isActive && <div className="psu-active-dot"></div>}
                    </div>

                    {/* Post indhold */}
                    <div className="psu-card-content">
                      <div className="psu-card-title orange">{post.title}</div>
                      <div className="psu-card-description">{post.details}</div>

                      {/* Tags fra Firestore */}
                      <div className="psu-card-tags">
                        {post.tags &&
                          post.tags.map((tag, index) => (
                            <span key={index} className="psu-tag">
                              #{tag}
                            </span>
                          ))}
                      </div>

                      {/* Bruger navn fra Firestore */}
                      <div className="psu-card-user">
                        {post.userName || "Anonym_ugle"}
                      </div>

                      {/* Stats knapper - interesseret og deltager */}
                      <div className="psu-card-stats">
                        <div className="psu-stats-container">
                          {/* Interesseret knap */}
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

                          {/* Deltager knap */}
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
        </div>
      </div>
    </div>
  );
}
