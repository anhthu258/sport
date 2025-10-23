import React, { useState } from 'react';
import '../Styling/Login.css';
import LoginForm from '../components/LoginForm';
import Signup from './Signup';

export default function Login() {
  // 'view' styrer hvilken sektion der vises: 'choice' | 'login' | 'signup'
  const [view, setView] = useState('choice');

  // Simpel callback når login forsøges (kan udskiftes med rigtig auth)
  const handleLogin = (username, password) => {
    // TODO: tilføj autentificering her (eksempel: kald til Firebase eller eget API)
    console.log('Login attempt:', username, password);
  };

  return (
    <section className="login-container">
      {/* Hero-sektionen: viser overskrift afhængigt af view */}
      <aside className="hero">
        <h2>
          {view === 'choice' ? 'Velkommen' : view === 'login' ? 'Login' : 'Sign up'}
        </h2>
      </aside>

      {/* Panel der indeholder knapper der leder til formularen */}
      <div className="auth-panel">
        {/* Choice-view: to store knapper der skifter view */}
        {view === 'choice' && (
          <div className="auth-wrap">
            <aside className="auth-actions">
              <button className="btn" onClick={() => setView('login')}>Log in</button> {/* når knappen klickes, vises valgte "view */}
              <button className="btn" onClick={() => setView('signup')}>Sign up</button>
            </aside>
          </div>
        )}

        {/* Login-view: viser LoginForm og link til signup */}
        {view === 'login' && (
          <>
            {/* LoginForm kalder handleLogin ved submit */}
            <LoginForm onLogin={handleLogin} />
            <p className="auth-note">
              Ikke oprettet?{' '}
                <button className="btn-inline" onClick={() => setView('signup')}>Opret konto</button>
            </p>
          </>
        )}

        {/* Signup-view: viser Signup-komponenten og link tilbage til login */}
        {view === 'signup' && (
          <>
            <Signup />
            <p className="auth-note">
              Allerede bruger?{' '}
              <button className="btn-inline" onClick={() => setView('login')}>Login</button>
            </p>
          </>
        )}
      </div>
    </section>
  );
}