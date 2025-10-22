import '../Styling/Login.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { auth, db } from '../assets/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Signup() {
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
   */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // simpel validering
    if (!username || !email || !password) {
      setError('Please fill out all fields.');
      return;
    }

    try {
    // Opret bruger i Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

    // Opdatér displayName i auth-profil
      await updateProfile(user, { displayName: username });

    // Gem brugerprofil i Firestore under collection 'profil'
      await setDoc(doc(db, 'profil', user.uid), {
        uid: user.uid,
        username,
        email,
        createdAt: serverTimestamp(),
      });

    // Naviger til login efter succes
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Signup failed');
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
            <input name="username" value={username} onChange={(e) => setUsername(e.target.value)} />
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
            <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </section>

        {/* Vis fejlbesked hvis der er en */}
        {error && <p className="error">{error}</p>}
          <button type="submit" className="btn">Create account</button>
      </form>
    </section>
  );
}