import React, { useState } from 'react';
import { Link } from 'react-router';

const MIN_PASSWORD = 8; // <-- minimum længde for password

export default function LoginForm({ onLogin }) {
    // state til inputfelter + fejl
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // submit-handler: kald callback hvis valideret
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Please fill in both fields.');
            return;
        }
        if (password.length < MIN_PASSWORD) { // <-- minimum længde for password
            setError(`Password must be at least ${MIN_PASSWORD} characters.`);
            return;
        }
        onLogin?.(username, password);
    };

    return (
        <form onSubmit={handleSubmit} className="form-container">
            {/* brugernavn felt */}
            <aside className="field">
                <label htmlFor="username">Username</label>
                <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
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