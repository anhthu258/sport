import React, { useState } from 'react';
import { Link } from 'react-router';

export default function LoginForm({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (username && password) {
            onLogin?.(username, password);
        } else {
            setError('Please fill in both fields.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-container">
            <aside className="field">
                <label htmlFor="username">Username</label>
                <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    inputMode="text"
                />
            </aside>
            <aside className="field">
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                />
            </aside>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn">Login</button>

            <p className="signup-prompt">
                Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
        </form>
    );
}