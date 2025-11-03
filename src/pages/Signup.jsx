import '../Styling/Login.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { auth, db } from '../assets/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
export default function Signup({onSuccess}) {
  const MAX_USERNAME = 25; // <-- maks længde for brugernavn
  const MIN_PASSWORD = 8; // <-- minimum længde for password
  // lokal state for formularfelter
  const [username, setUsername] = useState(''); // <-- brugernavn state
  const [email, setEmail] = useState(''); // <-- email state
  const [password, setPassword] = useState('');  // <-- password state
  const [error, setError] = useState('');  // <-- fejlbesked
  const [success, setSuccess] = useState(''); // <-- success notification
  const navigate = useNavigate(); // <-- hook til navigation

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // simpel validering
    if (!username || !email || !password) {
      setError("Udfyld venligst alle felter.");
      return;
    }

    // Force max længde for brugernavn
    if (username.length > MAX_USERNAME) {
      setError(`Brugernavn skal være ${MAX_USERNAME} tegn eller mindre.`);
      return;
    }

    // Force minimum længde for password
    if (password.length < MIN_PASSWORD) {
      setError(`Adgangskoden skal være mindst ${MIN_PASSWORD} karakterer.`);
      return;
    }

    try {
      // Opret bruger i Firebase Auth ved at genbruge auth fra src/assets/firebase
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // valgfrit: opdater displayName i Auth
      await updateProfile(user, { displayName: username });

      // Gem brugerdata i Firestore under "profil" collection
      await setDoc(doc(db, 'profil', user.uid), {
        uid: user.uid,
        username,
        email,
        createdAt: serverTimestamp(),
        password,
      });

      // viser en kort success besked før redirect til login holder i 1200ms
      setSuccess('Account created');
      setTimeout(() => {
        if (typeof onSuccess === 'function') {
          onSuccess(); // tell parent to show choice view
        }
      }, 1200);

      // clear sensitive state
      setPassword('');
    } catch (err) {
      console.error(err);
      const raw = err?.code || err?.message || "Tilmelding mislykkedes";
      const friendly = String(raw).replaceAll('-', ' ').replaceAll('auth/', '');
      setError(friendly);
    }
  };

  return (
    <section className="login-container">
      <form onSubmit={handleSubmit} className="form-container">
        <section className="field">
          <label>
            Username
            <input
              name="Brugernavn"
              maxLength={MAX_USERNAME}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
        </section>

        <section className="field">
          <label>
            Email
            <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </section>

        <section className="field">
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={MIN_PASSWORD}   // <-- prevents shorter input in supporting browsers
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </section>

        {/* Vis fejlbesked hvis der er en */}
        {error && <p className="error">{error}</p>}
        {/* Vis success besked når man fik lavet sin konto */}
        {success && <p className="success" role="status">{success}</p>}
        <button type="submit" className="btn">Opret konto</button>
      </form>
    </section>
  );
}
