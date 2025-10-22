
import '../Styling/Login.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { auth, db } from '../assets/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password) {
      setError('Please fill out all fields.');
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // set display username
      await updateProfile(user, { displayName: username });

      // archive af user data i firestore
      await setDoc(doc(db, 'profil', user.uid), {
        uid: user.uid, // unik id (hvordan vi får en random id idk)
        username,
        email,
        createdAt: serverTimestamp(), // gemmer tidspunkt for oprettelse
      });

      // efter signup, naviger til login
      navigate('/login');
    } catch (err) {  // fejl håndtering onboarding
      console.error(err);
      setError(err.message || 'Signup failed');
    }
  };

        //selve formularen
  return (
    <section className="login-container">
      <aside className='hero'>
        <h2>Sign up</h2>
      </aside>
      <form onSubmit={handleSubmit} className="form-container">
        <section className="field">
          <label>Username
            <input name="username" value={username} onChange={(e)=>setUsername(e.target.value)} />
          </label>
        </section>
        <section className="field">
          <label>Email
            <input name="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </label>
        </section>
        <section className="field">
          <label>Password
            <input name="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </label>
        </section>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn">Create account</button>
      </form>
    </section>
  );
}