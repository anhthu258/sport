// Opret Post komponent - formular til at oprette nye sportsopslag
import { useEffect, useState } from "react";
import "../styling/Opret_post.css";
import { serverTimestamp } from "firebase/firestore";
import { db, auth } from "../assets/firebase";
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
  // useEffect kører når komponenten mountes (første gang den vises)
  useEffect(() => {
    // Async funktion der henter data fra Firestore
    async function fetchOptions() {
      try {
      
        // Hent alle lokationer fra "hotspots" collection
        const locationsSnapshot = await getDocs(collection(db, "hotspots"));
        // Konverter Firestore dokumenter til JavaScript objekter
        setLocationOptions(
          locationsSnapshot.docs.map((doc) => ({
            //alle dokumenter fra Firestore
            id: doc.id, // Firestore Dokument ID
            ...(doc.data() || {}), // Alle felter fra dokumentet (activeplayers, hotspotId og koordinator)
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

    const userDoc = await getDoc(doc(db, "profil", auth.currentUser.uid)); //Henter alt data fra profil, og fortæller hvilken user, der er logget ind "auth"
    const user = auth.currentUser; //CurrentUser = User
    const userData = userDoc.data() //konstant til alt data 

    if(!user){ //Hvis der ikke er noget user logget ind, så gør dette
        setMessage("Du kan ikke oprette opslag, uden at være logget ind");
        return;
    } //Ellers bare fortsæt resten af scriptet

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
      creatorId: auth.currentUser.uid, //Nuværende userID
      userName: userData.username, //Username, som brugeren selv har tastet ind
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
  }
});



  
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
            value={location} // Binder til location state / viser den valgte lokation
            onChange={(e) => {
              setLocation(e.target.value); // Opdater lokationens state / gem den nye lokation
              handleLocationChange(e); // Kald funktionen der henter sportsgrene
            }}
          >
            <option value="">Vælg en lokation</option>
            {/* Vis alle tilgængelige lokationer fra Firestore */}
            {/* Map over alle lokationer og vis dem som options */}
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.hotspotid || loc.id}{" "}
                {/* Vis hotspotid eller Firestore dokument ID som fallback */}
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
                  {s} {/* Vis sportsgrenens navn i dropdown*/}
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
