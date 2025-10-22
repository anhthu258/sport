import { useCallback, useEffect, useRef, useState } from "react";
import "../Styling/PostSildeOp.css";

/**
 * PostSildeOp - Bottom Sheet Component
 *
 * En gennemsigtig bottom sheet der kan trækkes op og ned, ligesom Google Maps.
 * Kun håndtaget (den lille grå streg) og PNG teksturen er draggable.
 *
 * Props:
 * - open: boolean - om sheet'en er åben
 * - onClose: function - kaldes når sheet lukkes
 * - initialHeight: number - start højde i pixels (default: 120)
 * - maxHeightPercent: number - max højde som % af skærm (default: 85)
 * - header: React node - header indhold (f.eks. "DOKK1")
 * - children: React node - hovedindhold
 *
 * Usage:
 * <PostSildeOp open={isOpen} onClose={() => setIsOpen(false)} header={<div>DOKK1</div>}>
 *   Indhold her...
 * </PostSildeOp>
 */
export default function PostSildeOp({
  open = false, // Om bottom sheet er åben
  onClose, // Funktion der kaldes når sheet lukkes
  initialHeight = 200, // Start højde i pixels
  maxHeightPercent = 100, // Max højde som procent af skærm
  header, // Header indhold (f.eks. "DOKK1")
  children, // Hovedindhold
}) {
  // Refs til DOM elementer og drag state
  const containerRef = useRef(null); // Overlay container
  const sheetRef = useRef(null); // Bottom sheet element
  const startYRef = useRef(0); // Start Y position ved drag
  const startHeightRef = useRef(0); // Start højde ved drag

  // State for sheet højde og drag status
  const [height, setHeight] = useState(initialHeight);
  const [isDragging, setIsDragging] = useState(false);

  // Utility funktion til at begrænse værdi mellem min og max
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // Beregner maksimal højde baseret på skærmstørrelse
  const getMaxHeight = useCallback(() => {
    const viewportH = window.innerHeight;
    return Math.round((maxHeightPercent / 100) * viewportH);
  }, [maxHeightPercent]);

  const minHeight = 80; // Minimum højde når collapsed (peek)

  // Når sheet åbnes, sæt højde til mellem min og max
  useEffect(() => {
    if (!open) return;
    const maxH = getMaxHeight();
    setHeight((h) => clamp(h || initialHeight, minHeight, maxH));
  }, [open, getMaxHeight, initialHeight]);

  // Lytter efter Escape tast for at lukke sheet
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose && onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Starter drag operation - gemmer start position og højde
  const beginDrag = (clientY) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = height;
    document.body.style.userSelect = "none"; // Forhindrer tekst markering under drag
  };

  // Håndterer start af drag - tillad drag fra hele bottom sheet
  const onPointerDown = (e) => {
    // Tillad drag fra hele bottom sheet, ikke kun handle området
    if (!e.target.closest(".psu-sheet")) return;

    // Vigtigt: preventDefault først for iPhone
    e.preventDefault();
    e.stopPropagation();

    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    beginDrag(clientY);
  };

  // Håndterer drag bevægelse - opdaterer højde i real-time med requestAnimationFrame
  const onPointerMove = (e) => {
    if (!isDragging) return;

    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = startYRef.current - clientY; // drag up increases height
    const maxH = getMaxHeight();

    // Ekstra glidende sensitivity for ultra smooth drag
    const sensitivity = 1.8; // Højere følsomhed for ekstra glidende følelse
    const adjustedDelta = delta * sensitivity;
    const newHeight = clamp(
      startHeightRef.current + adjustedDelta,
      minHeight,
      maxH
    );

    // Altid preventDefault for ultra smooth drag
    e.preventDefault();
    e.stopPropagation();

    // requestAnimationFrame for ekstra smooth animation
    requestAnimationFrame(() => {
      setHeight(newHeight);
    });
  };

  // Håndterer slutning af drag - snap til nærmeste position med smooth transition
  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    document.body.style.userSelect = "";

    // Snap logik: snap til min, mid eller max højde
    const maxH = getMaxHeight();
    const mid = Math.round((minHeight + maxH) / 2);
    const current = height;
    let target = current;
    if (current < (minHeight + mid) / 2) target = minHeight;
    else if (current < (mid + maxH) / 2) target = mid;
    else target = maxH;

    // Smooth snap animation
    requestAnimationFrame(() => {
      setHeight(target);
    });
  };

  // Tilføjer event listeners for mouse og touch events
  useEffect(() => {
    // iPhone optimerede event listeners
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchmove", onPointerMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchend", onPointerUp, {
      passive: false,
      capture: true,
    });
    return () => {
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchmove", onPointerMove, { capture: true });
      window.removeEventListener("touchend", onPointerUp, { capture: true });
    };
  });

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
        className="psu-sheet"
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
        {header ? <div className="psu-header">{header}</div> : null}

        {/* Hovedindhold - ikke draggable */}
        <div className="psu-content">{children}</div>
      </div>
    </div>
  );
}
