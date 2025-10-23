import { useState } from "react";
import PostSildeOp from "../components/PostSildeOp";

/**
 * Test page for PostSildeOp component
 *
 * Denne side demonstrerer bottom sheet funktionaliteten.
 * Sheet'en starter åben og kan trækkes op/ned.
 *
 * Features:
 * - Bottom sheet med drag funktionalitet
 * - Header med "DOKK1" titel
 * - Gennemsigtig PNG tekstur baggrund
 * - Smooth animations og scrolling
 */
export default function Test() {
  // State for at kontrollere om bottom sheet er åben
  const [open, setOpen] = useState(true);

  return (
    <div style={{ height: "100dvh", padding: 16 }}>
      {/* Bottom sheet komponent */}
      <PostSildeOp
        open={open} // Om sheet er åben
        onClose={() => setOpen(false)} // Funktion der lukker sheet
        header={<div>DOKK1</div>} // Header titel
        initialHeight={180} // Start højde i pixels - collapsed state
        maxHeightPercent={100} // Max højde som % af skærm
      >
        {/* Tom bottom sheet til test */}
      </PostSildeOp>
    </div>
  );
}
