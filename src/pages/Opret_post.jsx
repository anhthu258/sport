//opsæt formular
import { useState } from "react"
//import firebase elementer der skal bruges

// import firebase fra hotspot

export default function OpretPost(){
    const [beskrivelse, setBeskrivelse] = useState(""); //Gemmer beskrivelsen, som brugeren skriver
    const [sport, setSport] = useState(""); //gemmer sporten, som brugeren vælger, afhænger af hvad, der er muligt for hotspottet
    const [message, setMessage] = useState(""); // Viser beskeder til brugeren
    const [location, setLocation] = useState(""); //skal komme fra en bestemt liste man kan vælge imellem, eller fra hotspot_data

    //backend af formular kommet her

    //async function "handleSubmit", der tjekker forskellige parametrer
    async function handleSubmit(e) {
  e.preventDefault(); // forhindrer side reload

  if (!beskrivelse || !sport) {
    setMessage("Udfyld venligst alle felter");
    return;
  }

  // Her kommer Firebase-kaldet senere
}


    return(
        <div className="OpretPost">
            <form onSubmit={handleSubmit}>
                <label>Lokation</label>
                <input 
                    value={location} //ændres til dropdown menu senere, for nu bare tekst
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Vælg lokation"
                    
                />
                <label>Beskrivelse</label>
                <input
                    value={beskrivelse}
                    onChange={(e) => setBeskrivelse(e.target.value)}
                    placeholder="Skriv en kort titel"
                />
                <label>Sport</label>
                <input
                    value={sport} //I et andet dokument skal titel = sport
                    onChange={(e) => setSport(e.target.value)} //sætter sporten til hvad man har valgt, det her skal ændres til "sport tags"
                    placeholder="Sport fx basketball"
                />
                <button type="submit">Opret opslag</button>
                {message && <p>{message}</p>}

            </form>

        </div>
        
    )
}