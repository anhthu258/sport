// Opret Post komponent - formular til at oprette nye sportsopslag
import { useEffect, useState } from "react";
import "../styling/Opret_post.css";
import { serverTimestamp } from "firebase/firestore";
import { db } from "../assets/firebase";
import { collection, addDoc, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";

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
                                                                
        // Hent alt data fra "hotspots" collection
        const locationsSnapshot = await getDocs(collection(db, "hotspots"));
        setLocationOptions(
          locationsSnapshot.docs.map((doc) => ({
            id: doc.id, // Dokument ID
            ...(doc.data() || {}), // Alle felter fra dokumentet (name, sportgren, etc.)
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

  async function handleLocationChange(e) {
    const selectedLocationId = e.target.value;
    setLocation(selectedLocationId);
    setSportsOptions([]); // ryd før ny indlæsning

    if (!selectedLocationId) return;

    try {
      const locationRef = doc(db, "hotspots", selectedLocationId);
      const locationSnap = await getDoc(locationRef);

      if (locationSnap.exists()) {
        const data = locationSnap.data();
        // sætter sportsoptions til inholdet, som er inde i "sportsgren"
        setSportsOptions(data.sportsgren || []);
      } else {
        console.warn("Lokationen blev ikke fundet i Firestore");
      }
    } catch (err) {
      console.error("Fejl ved hentning af sportsgrene:", err);
      setMessage("Der opstod en fejl – prøv igen senere.");
    }
  }

  // Håndterer når brugeren indsender formularen
  async function handleSubmit(e) {
    e.preventDefault(); // Forhindrer at siden reloader



    //Script til at slette alle gamle posts, hvis det er ældre end 24 timer

//     const postsSnapshot = await getDocs(collection(db, "posts")); //fetcher alle posts
//     const now = new Date(Date.now() - 24 * 60 * 60 *1000); //laver en konstant ud fra 24 timer

//     postsSnapshot.forEach(async (postDoc) => {
//     const postData = postDoc.data();
     
//     // Sørg for at der overhovedet er et timestamp
//     if (postData.timestamp) {
//     const postTime = postData.timestamp.toDate(); // Firestore timestamp → JS Date

//     // Hvis postens tidspunkt er ældre end nu
//     if (postTime < now) {
//       await deleteDoc(doc(db, "posts", postDoc.id));
//     }
//   }
// });


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
      creatorId: "BrugerID", // TODO: Erstat med rigtig bruger ID ???????? vi venter på race
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
    setSportsOptions([]);

    //sletter de posts, der er fra i går
    const postsSnapshot = await getDocs(collection(db, "posts")); //henter alle posts
const today = new Date(); //konstant, der er baseret på den nuværende dato, klokkeslet mm

postsSnapshot.docs.forEach(async (postDoc) => { //for hvert post
  const postData = postDoc.data(); //opret postData

  if (!postData.timestamp) return; //hvis den her data ikke har et timestamp, så ignorer det

  const postTimestamp = postData.timestamp.toDate(); //konstant baseret på timestamp data på de aktuelle posts

  // Sammenlign kun dato (ikke klokkeslæt)
  const isFromAnotherDay =
    postTimestamp.getDate() !== today.getDate() ||
    postTimestamp.getMonth() !== today.getMonth() ||
    postTimestamp.getFullYear() !== today.getFullYear(); //Hvis postens år, måned og dag ikke er det samme som idags, så = isFromAnotherDay

  // Hvis opslaget er fra en tidligere dag => slet det
  if (isFromAnotherDay) { //Hvis en post hører under "isFromAnotherDay", så slet
    await deleteDoc(doc(db, "posts", postDoc.id));
    console.log(`🗑️ Slettede gammelt opslag: ${postDoc.id}`);
  }
});
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
             onChange={(e) => {
            setLocation(e.target.value); // Opdater lokationens state
            handleLocationChange(e);     // Kald funktionen der henter sportsgrene
  }}
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
          {/* Sportsgren */}
          <div className="form-group">
            <label className="form-label">Sportsgren</label>
            <select className="select" value={sport} onChange={(e) => setSport(e.target.value)}
              disabled={!sportsOptions.length} //Hvis der ikke er nogen længde, så kan den ikke selectes, altså klik på lokation først
            >
              <option value="">
                {sportsOptions.length
                  ? "Vælg en sportsgren"
                  : "Vælg lokation"}
              </option>
              {sportsOptions.map((s, i) => (
                <option key={i} value={s}>
                  {s}
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
