import React, { useState } from 'react';
import { Link } from 'react-router';

export default function LoginForm({ onLogin }) {
    // state til inputfelter + fejl
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // submit-handler: kald callback hvis valideret
    const handleSubmit = (e) => {
        e.preventDefault();
        if (username && password) {
            onLogin?.(username, password); // kald parent-handler hvis defineret
        } else {
            setError('Please fill in both fields.');
        }
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
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </aside>

            {/* fejl besked */}
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn">Log in</button>
        </form>
    );
}