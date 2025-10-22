import { useCallback, useEffect, useRef, useState } from "react";
import "../Styling/PostSildeOp.css";

// Simple, dependency-free bottom sheet with drag + snap points
// Usage:
// <PostSildeOp open={isOpen} onClose={() => setIsOpen(false)}>
//   ... content ...
// </PostSildeOp>

export default function PostSildeOp({
  open = false,
  onClose,
  initialHeight = 120,
  maxHeightPercent = 85,
  header,
  children,
}) {
  const containerRef = useRef(null);
  const sheetRef = useRef(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const [height, setHeight] = useState(initialHeight);
  const [isDragging, setIsDragging] = useState(false);

  // Clamp utility
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const getMaxHeight = useCallback(() => {
    const viewportH = window.innerHeight;
    return Math.round((maxHeightPercent / 100) * viewportH);
  }, [maxHeightPercent]);

  const minHeight = 80; // collapsed peek

  useEffect(() => {
    if (!open) return;
    const maxH = getMaxHeight();
    setHeight((h) => clamp(h || initialHeight, minHeight, maxH));
  }, [open, getMaxHeight, initialHeight]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose && onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const beginDrag = (clientY) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = height;
    document.body.style.userSelect = "none";
  };

  const onPointerDown = (e) => {
    // Only allow dragging from the handle bar itself, not the entire area
    if (!e.target.closest(".psu-handle")) return;
    e.preventDefault();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    beginDrag(clientY);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = startYRef.current - clientY; // drag up increases height
    const maxH = getMaxHeight();
    setHeight(clamp(startHeightRef.current + delta, minHeight, maxH));
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    document.body.style.userSelect = "";

    // Snap logic: to min, mid, or max
    const maxH = getMaxHeight();
    const mid = Math.round((minHeight + maxH) / 2);
    const current = height;
    let target = current;
    if (current < (minHeight + mid) / 2) target = minHeight;
    else if (current < (mid + maxH) / 2) target = mid;
    else target = maxH;
    setHeight(target);
  };

  useEffect(() => {
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
    return () => {
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
    };
  });

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="psu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Detaljer"
    >
      <button
        className="psu-backdrop"
        aria-label="Luk"
        onClick={() => onClose && onClose()}
      />

      <div ref={sheetRef} className="psu-sheet" style={{ height }}>
        <div className="psu-handleArea">
          <div
            className="psu-handle"
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
            role="button"
            aria-label="Træk for at udvide"
            tabIndex={0}
          />
        </div>

        {header ? <div className="psu-header">{header}</div> : null}

        <div className="psu-content" style={{ pointerEvents: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
