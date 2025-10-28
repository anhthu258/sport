import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { auth, db } from '../assets/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const MIN_PASSWORD = 8; // <-- minimum længde for password

export default function LoginForm({ onLogin }) {
    const navigate = useNavigate(); // navigere efter successful sign-in

    // state til inputfelter + fejl
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // submit-handler: kald callback hvis valideret
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!identifier || !password) {
            setError('Please fill in both fields.');
            return;
        }
        if (password.length < MIN_PASSWORD) {
            setError(`Password must be at least ${MIN_PASSWORD} characters.`);
            return;
        }

        try {
            // finder ud af om identifier er email eller username
            let emailToUse = identifier.trim();
            if (!emailToUse.includes('@')) {
                // behandlet som username: slå email op i Firestore
                const q = query(collection(db, 'profil'), where('username', '==', emailToUse));
                const snap = await getDocs(q);
                if (snap.empty) {
                    setError('No account found for that username.');
                    return;
                }
                // tag første matchende dokument
                const docData = snap.docs[0].data();
                if (!docData?.email) {
                    setError('User record missing email.');
                    return;
                }
                emailToUse = docData.email;
            }

            const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
            const user = userCredential.user;

            // notify parent if provided
            onLogin?.(user, null);

            // navigate to TestingMAPSTUFFPage (andre route hvis der er behov stadig under testing)
            navigate('/testing-map');
        } catch (err) {
            console.error(err);
            const friendly = String(err?.code || err?.message || 'Sign in failed')
              .replaceAll('-', ' ')
              .replaceAll('auth/', '');
            setError(friendly);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-container">
            {/* username or email felt */}
            <aside className="field">
                <label htmlFor="identifier">Username or Email</label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="username or email"
                />
            </aside>

            {/* adgangskode felt */}
            <aside className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" minLength={MIN_PASSWORD} value={password} onChange={(e)=>setPassword(e.target.value)} />
            </aside>

            {/* fejl besked */}
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn">Log in</button>
        </form>
    );
}