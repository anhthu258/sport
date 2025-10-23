import '../Styling/Login.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { auth, db } from '../assets/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
export default function Signup() {
  const MAX_USERNAME = 25; // <-- maks længde for brugernavn
  const MIN_PASSWORD = 8; // <-- minimum længde for password
// lokal state for formularfelter
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  /**
   * Håndterer submit af signup-formular
   * - validerer felter
   * - opretter bruger i Firebase Auth
   * - gemmer profil i Firestore
   * - gemmer timeline i Firestore
   */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // simpel validering
    if (!username || !email || !password) {
      setError('Please fill out all fields.');
      return;
    }

    // Force max længde for brugernavn
    if (username.length > MAX_USERNAME) {
      setError(`Username must be ${MAX_USERNAME} characters or less.`);
      return;
    }

    // Force minimum længde for password
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
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
      });

      // naviger efter succes
      navigate('/login');
    } catch (err) {
      console.error(err);
      // make firebase error code more readable like template does
      const raw = err?.code || err?.message || 'Signup failed';
      const friendly = String(raw).replaceAll('-', ' ').replaceAll('auth/', '');
      setError(friendly);
    }
  };

  // selve formularen
  return (
    <section className="login-container">
      <form onSubmit={handleSubmit} className="form-container">
        {/* Brugervenligt label + input til brugernavn */}
        <section className="field">
          <label>
            Username
            <input
              name="username"
              maxLength={MAX_USERNAME}   // <-- prevents typing longer than limit
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
        </section>

        {/* Email-felt */}
        <section className="field">
          <label>
            Email
            <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </section>

        {/* Password-felt */}
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
          <button type="submit" className="btn">Create account</button>
      </form>
    </section>
  );
}