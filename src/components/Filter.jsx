// Importerer React hooks til at håndtere state og sideeffekter
import { useEffect, useState } from "react";
// Importerer Firebase database forbindelse
import { db } from "../assets/firebase";
// Importerer Firestore funktioner til at hente data
import { collection, getDocs } from "firebase/firestore";

// Filter komponent der viser knapper for forskellige sportsgrene
// onFilterChange: funktion der kaldes når brugeren vælger en sport
// selectedSport: den sport der er valgt i øjeblikket
// sports: liste af sportsgrene der kan sendes ind udefra
export default function Filter({ onFilterChange, selectedSport, sports }) {
  // State til at gemme sportsdata - tjekker om sports er en array, ellers bruger tom array
  const [sportsData, setSportsData] = useState(
    Array.isArray(sports) ? sports : []
  );
  // State til at holde styr på om data bliver hentet
  const [loading, setLoading] = useState(true);

  // useEffect kører når komponenten loader eller når 'sports' prop ændrer sig
  useEffect(() => {
    // Hvis sports allerede er sendt ind som prop og indeholder data, brug det
    if (Array.isArray(sports) && sports.length) {
      setSportsData(sports);
      setLoading(false);
      return;
    }
  // Flag til at forhindre state-opdateringer, hvis komponenten bliver fjernet fra siden
    let cancelled = false;
    // Asynkron funktion til at hente sports fra Firebase
    (async () => {
      try {
        // Henter alle dokumenter fra "sports" collection i Firebase
        const snap = await getDocs(collection(db, "sports"));
        // Konverterer Firebase dokumenter til et array af objekter
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  // Opdaterer state, hvis komponenten stadig vises
        if (!cancelled) setSportsData(list);
      } catch (err) {
        // Logger fejl til konsollen
        console.error("Failed to load sports", err);
      } finally {
        // Sætter loading til false når vi er færdige (succes eller fejl)
        if (!cancelled) setLoading(false);
      }
    })();
    // Oprydningsfunktion, der kører, når komponenten bliver fjernet fra siden
    return () => {
      cancelled = true;
    };
  }, [sports]); // Kører igen hvis 'sports' prop ændrer sig

  // Hvis vi stadig loader og ingen data er hentet endnu, vis ingenting
  if (loading && sportsData.length === 0) return null;

  // Returnerer filter UI'en
  return (
    <div className="filter">
      {/* Looper gennem alle sportsgrene og laver en knap for hver */}
      {sportsData.map((x) => {
        // Tjekker om denne sport er den valgte
        const isActive = selectedSport === x.id;
        // Finder navnet på sporten (prøver forskellige mulige felter)
        const label = x.name || x.title || x.id;
        return (
          <button
            key={x.id}
            // Når der klikkes: kalder onFilterChange med sport id (eller null hvis allerede valgt)
            onClick={() =>
              onFilterChange?.({ sportId: isActive ? null : x.id })
            }
            // Tilføjer "is-active" class hvis denne sport er valgt
            className={`filter__btn${isActive ? " is-active" : ""}`}
            title={label}
          >
            {x.icon ? <span>{x.icon}</span> : null}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
