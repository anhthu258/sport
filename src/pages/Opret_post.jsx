// Opret Post komponent - formular til at oprette nye sportsopslag
// Dette er hovedkomponenten for at oprette nye sportsopslag i applikationen
import { useEffect, useState } from "react"; // React hooks til state management og lifecycle
import "../styling/Opret_post.css"; // CSS styling for denne komponent
import { serverTimestamp } from "firebase/firestore"; // Firebase funktion til automatisk tidsstempel
import { db } from "../assets/firebase"; // Firebase database forbindelse
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore"; // Firebase funktioner til database operationer

export default function OpretPost() {
  // State for formularens input felter
  const [title, setTitle] = useState(""); // Postens titel
  const [sport, setSport] = useState(""); // Valgt sportsgren (ID fra Firestore)
  const [location, setLocation] = useState(""); // Valgt lokation (ID fra Firestore)
  const [time, setTime] = useState(""); // Tidspunkt for aktiviteten
  const [details, setDetails] = useState(""); // Beskrivelse
  const [message, setMessage] = useState(""); // Beskeder til brugeren (poset eller ej)

  // State for dropdown valgmuligheder hentet fra Firestore
  const [sportsOptions, setSportsOptions] = useState([]); // Liste af tilgængelige sportsgrene
  const [locationOptions, setLocationOptions] = useState([]); // Liste af tilgængelige lokationer

  // Hent sportsgrene og lokationer fra Firestore når komponenten loader
  // useEffect kører når komponenten mountes (første gang den vises)
  useEffect(() => {
    // Async funktion der henter data fra Firestore
    async function fetchOptions() {
      try {
        // Hent alle sportsgrene fra "sports" collection, ikke sådan den fungerer
        // Dette er kommenteret ud fordi sportsgrene hentes dynamisk baseret på valgt lokation
        // const sportsSnapshot = await getDocs(collection(db, "sports"));
        // setSportsOptions(
        // sportsSnapshot.docs.map((doc) => ({
        // id: doc.id, // Dokument ID
        // ...(doc.data() || {}), // Alle felter fra dokumentet (name, title, etc.)
        // }))
        // );

        // Hent alle lokationer fra "hotspots" collection
        // Dette henter alle tilgængelige lokationer fra Firestore
        const locationsSnapshot = await getDocs(collection(db, "hotspots"));
        // Konverter Firestore dokumenter til JavaScript objekter
        setLocationOptions(
          locationsSnapshot.docs.map((doc) => ({
            id: doc.id, // Dokument ID fra Firestore
            ...(doc.data() || {}), // Alle felter fra dokumentet (name, address, etc.)
          }))
        );
      } catch (err) {
        // Log fejl hvis data ikke kan hentes fra Firestore
        console.error("Kunne ikke hente options", err);
      }
    }

    // Kald funktionen når komponenten mountes
    fetchOptions();
  }, []); // Tom dependency array = kør kun ved første load (ikke ved re-render)

  // Håndterer når brugeren vælger en lokation fra dropdown
  // Dette funktion henter sportsgrene baseret på den valgte lokation
  async function handleLocationChange(e) {
    // Hent den valgte lokations ID fra dropdown
    const selectedLocationId = e.target.value;
    setLocation(selectedLocationId); // Opdater lokations state
    setSportsOptions([]); // ryd før ny indlæsning (fjern gamle sportsgrene)

    // Hvis ingen lokation er valgt, stop funktionen
    if (!selectedLocationId) return;

    try {
      // Opret reference til den valgte lokation i Firestore
      const locationRef = doc(db, "hotspots", selectedLocationId);
      // Hent lokationsdata fra Firestore
      const locationSnap = await getDoc(locationRef);

      // Tjek om lokationen eksisterer i Firestore
      if (locationSnap.exists()) {
        const data = locationSnap.data(); // Hent alle data fra dokumentet
        // sætter sportsoptions til inholdet, som er inde i "sportsgren"
        // Hver lokation har et "sportsgren" array med tilgængelige sportsgrene
        setSportsOptions(data.sportsgren || []);
      } else {
        console.warn("Lokationen blev ikke fundet i Firestore");
      }
    } catch (err) {
      // Håndter fejl hvis data ikke kan hentes
      console.error("Fejl ved hentning af sportsgrene:", err);
      setMessage("Der opstod en fejl – prøv igen senere.");
    }
  }

  // Håndterer når brugeren indsender formularen
  // Dette er hovedfunktionen der gemmer det nye opslag i Firestore
  async function handleSubmit(e) {
    e.preventDefault(); // Forhindrer at siden reloader (standard form behavior)

    // Valider at påkrævede felter er udfyldt
    // Tjek at de vigtigste felter ikke er tomme
    if (!title || !sport || !location) {
      setMessage("Udfyld venligst titel, sportsgren og lokation");
      return; // Stop funktionen hvis validering fejler
    }

    // Log data der sendes til Firestore (til debugging)
    // Dette hjælper med at debugge hvis der opstår problemer
    console.log("Forsøger at oprette opslag:", {
      title,
      sport,
      location,
      time,
      details,
    });

    // Gem opslaget i Firestore "posts" collection
    // Dette opretter et nyt dokument i "posts" collectionen
    await addDoc(collection(db, "posts"), {
      creatorId: "BrugerID", // TODO: Erstat med rigtig bruger ID ???????? vi venter på race
      hotspotId: location, // Reference til valgt lokation (Firestore dokument ID)
      title, // Postens titel (fra input felt)
      details, // Beskrivelse (fra textarea)
      time, // Tidspunkt for aktiviteten (fra time input)
      sport, // Reference til valgt sportsgren (fra dropdown)
      timestamp: serverTimestamp(), // Automatisk tidsstempel fra Firestore server
    });

    // Vis succesbesked og ryd formularen
    // Efter succesfuld oprettelse, vis besked og nulstil alle felter
    setMessage("Opslag oprettet!");
    setTitle(""); // Ryd titel
    setSport(""); // Ryd sportsgren
    setLocation(""); // Ryd lokation
    setTime(""); // Ryd tidspunkt
    setDetails(""); // Ryd beskrivelse
    setSportsOptions([]); // Ryd sportsgrene dropdown
  }

  // Render formularen med alle input felter
  // Dette er JSX der viser hele formularen til brugeren
  return (
    <div className="opret-post-page">
      {/* Header sektion med titel og dekoration */}
      <div className="opret-hero">
        <h1>Opret Post</h1>
        <div className="crown-doodle"></div> {/* Dekorativ element gul/grøn*/}
      </div>

      {/* Hovedformular - alle input felter og knapper */}
      <form className="opret-form" onSubmit={handleSubmit}>
        {/* Titel input felt - påkrævet felt for opslagets titel */}
        <div className="form-group">
          <label className="form-label">Titel</label>
          <input
            className="input"
            value={title} // Binder til title state
            onChange={(e) => setTitle(e.target.value)} // Opdater title state når bruger skriver
            placeholder="Skriv en titel" // Hjælpetekst for brugeren
          />
        </div>

        {/* Lokation dropdown - hentet fra Firestore */}
        {/* Dette er det første dropdown der skal vælges før sportsgren */}
        <div className="form-group">
          <label className="form-label">Lokation</label>
          <select
            className="select"
            value={location} // Binder til location state
            onChange={(e) => {
              setLocation(e.target.value); // Opdater lokationens state
              handleLocationChange(e); // Kald funktionen der henter sportsgrene
            }}
          >
            <option value="">Vælg en lokation</option>
            {/* Vis alle tilgængelige lokationer fra Firestore */}
            {/* Map over alle lokationer og vis dem som options */}
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name || loc.title || loc.id}{" "}
                {/* Vis navn, title eller ID som fallback */}
              </option>
            ))}
          </select>
        </div>

        {/* Sportsgren og tidspunkt i samme række */}
        {/* Disse to felter er placeret side om side for bedre layout */}
        <div className="form-row">
          {/* Sportsgren dropdown - afhænger af valgt lokation */}
          <div className="form-group">
            <label className="form-label">Sportsgren</label>
            <select
              className="select"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              disabled={!sportsOptions.length} //Hvis der ikke er nogen længde, så kan den ikke selectes, altså klik på lokation først
            >
              <option value="">
                {sportsOptions.length
                  ? "Vælg en sportsgren" // Vis hvis sportsgrene er tilgængelige
                  : "Vælg lokation"}{" "}
                {/* Vis hvis ingen sportsgrene er hentet endnu */}
              </option>
              {/* Map over alle tilgængelige sportsgrene for den valgte lokation */}
              {sportsOptions.map((s, i) => (
                <option key={i} value={s}>
                  {s} {/* Vis sportsgrenens navn */}
                </option>
              ))}
            </select>
          </div>

          {/* Tidspunkt input felt - valgfrit felt for aktivitetens tid */}
          <div className="form-group time">
            <label className="form-label">Tidspunkt</label>
            <input
              className="input"
              type="time" // HTML5 time input type
              value={time} // Binder til time state
              onChange={(e) => setTime(e.target.value)} // Opdater time state
            />
          </div>
        </div>

        {/* Detaljer textarea - valgfrit felt for yderligere beskrivelse */}
        <div className="form-group">
          <label className="form-label">Detaljer</label>
          <textarea
            className="textarea"
            rows={6} // Antal rækker i textarea
            value={details} // Binder til details state
            onChange={(e) => setDetails(e.target.value)} // Opdater details state
            placeholder="Skriv her..." // Hjælpetekst for brugeren
          />
        </div>

        {/* Send knap - submitter formularen */}
        <div className="actions">
          <button className="submit-btn" type="submit">
            Opret {/* Tekst på knappen */}
          </button>
        </div>

        {/* Vis besked hvis der er en (succes eller fejl) */}
        {/* Betinget rendering - vis kun hvis message state ikke er tom */}
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}
