// Intro/Splash Screen Komponent
// Viser en kort intro-skærm med SpotOn logoet før login-siden vises
import React, { useEffect, useState } from "react";
import "../Styling/Intro.css";

export default function Intro({ onComplete, isTransitioning }) {
  // State til at styre om intro-skærmen er synlig
  const [isVisible, setIsVisible] = useState(true);

  // useEffect hook der automatisk skjuler intro-skærmen efter 1.5 sekunder
  useEffect(() => {
    // Auto-skip efter 1.5 sekunder (meget kort varighed)
    const timer = setTimeout(() => {
      setIsVisible(false); // Start fade-out animation
      setTimeout(() => {
        onComplete?.(); // Kald callback når animation er færdig
      }, 400); // Vent på fade-out animation (0.4 sekunder)
    }, 1500); // Vis intro-skærmen i 1.5 sekunder

    // Cleanup: Ryd op timer hvis komponenten unmountes
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Håndterer klik på intro-skærmen - gør det muligt at springe intro over
  const handleClick = () => {
    setIsVisible(false); // Start fade-out animation
    setTimeout(() => {
      onComplete?.(); // Kald callback når animation er færdig
    }, 400); // Vent på fade-out animation
  };

  return (
    <div
      className={`intro-screen ${
        isVisible && !isTransitioning ? "visible" : "fade-out"
      }`}
      onClick={handleClick}
    >
      <div className="intro-content">
        {/* SpotOn logo billede */}
        <img
          src="img/SpotOnLogo.png"
          alt="SpotOn Logo"
          className="intro-logo-img"
        />
      </div>
    </div>
  );
}
