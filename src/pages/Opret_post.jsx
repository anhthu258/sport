// Opret Post komponent - formular til at oprette nye sportsopslag
import { useEffect, useState } from "react";
import "../styling/Opret_post.css";
import { serverTimestamp } from "firebase/firestore";
import { db } from "../assets/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

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
  useEffect(() => {
    async function fetchOptions() {
      try {
        // Hent alle sportsgrene fra "sports" collection, ikke sådan den fungerer
                                                                const sportsSnapshot = await getDocs(collection(db, "sports"));
                                                                setSportsOptions(
                                                                sportsSnapshot.docs.map((doc) => ({
                                                                    id: doc.id, // Dokument ID
                                                                    ...(doc.data() || {}), // Alle felter fra dokumentet (name, title, etc.)
                                                                }))
                                                                );
        
                                                                
        // Hent alle lokationer fra "hotspots" collection
        const locationsSnapshot = await getDocs(collection(db, "hotspots"));
        setLocationOptions(
          locationsSnapshot.docs.map((doc) => ({
            id: doc.id, // Dokument ID
            ...(doc.data() || {}), // Alle felter fra dokumentet (name, address, etc.)
          }))
        );
      } catch (err) {
        // Log fejl hvis data ikke kan hentes
        console.error("Kunne ikke hente options", err);
      }
    }

    // Kald funktionen når komponenten mountes
    fetchOptions();
  }, []); // Tom dependency array = kør kun ved første load

  // Håndterer når brugeren indsender formularen
  async function handleSubmit(e) {
    e.preventDefault(); // Forhindrer at siden reloader

    // Valider at påkrævede felter er udfyldt
    if (!title || !sport || !location) {
      setMessage("Udfyld venligst titel, sportsgren og lokation");
      return;
    }

    // Log data der sendes til Firestore (til debugging)
    console.log("Forsøger at oprette opslag:", {
      title,
      sport,
      location,
      time,
      details,
    });

    // Gem opslaget i Firestore "posts" collection
    await addDoc(collection(db, "posts"), {
      creatorId: "BrugerID", // TODO: Erstat med rigtig bruger ID
      hotspotId: location, // Reference til valgt lokation
      title, // Postens titel
      details, // Beskrivelse
      time, // Tidspunkt for aktiviteten
      sport, // Reference til valgt sportsgren
      timestamp: serverTimestamp(), // Automatisk tidsstempel fra Firestore
    });
          
    // Vis succesbesked og ryd formularen
    setMessage("Opslag oprettet!");
    setTitle("");
    setSport("");
    setLocation("");
    setTime("");
    setDetails("");
  }

  // Render formularen med alle input felter
  return (
    <div className="opret-post-page">
      {/* Header sektion med titel */}
      <div className="opret-hero">
        <h1>Opret Post</h1>
        <div className="crown-doodle"></div>
      </div>

      {/* Hovedformular */}
      <form className="opret-form" onSubmit={handleSubmit}>
        {/* Titel input felt */}
        <div className="form-group">
          <label className="form-label">Titel</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Skriv en titel"
          />
        </div>

        {/* Lokation dropdown - hentet fra Firestore */}
        <div className="form-group">
          <label className="form-label">Lokation</label>
          <select
            className="select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Vælg en lokation</option>
            {/* Vis alle tilgængelige lokationer fra Firestore */}
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name || loc.title || loc.id}
              </option>
            ))}
          </select>
        </div>

        {/* Sportsgren og tidspunkt i samme række */}
        <div className="form-row">
          {/* Sportsgren dropdown - hentet fra Firestore */}
          <div className="form-group">
            <label className="form-label">Sportsgren</label>
            <select
              className="select"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            >
              <option value="">Vælg en sportsgren</option>
              {/* Vis alle tilgængelige sportsgrene fra Firestore */}
              {sportsOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.title || s.id}
                </option>
              ))}
            </select>
          </div>

          {/* Tidspunkt input felt */}
          <div className="form-group time">
            <label className="form-label">Tidspunkt</label>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Skriv her */}
        <div className="form-group">
          <label className="form-label">Detaljer</label>
          <textarea
            className="textarea"
            rows={6}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Skriv her..."
          />
        </div>

        {/* Send knap */}
        <div className="actions">
          <button className="submit-btn" type="submit">
            Opret
          </button>
        </div>

        {/* Vis besked hvis der er en (succes eller fejl) */}
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}
