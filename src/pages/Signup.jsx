import '../Styling/Login.css';
import React from 'react';

export default function Signup() {
  return (
    <section className="login-container">
      <h2>Sign up</h2>
      <form onSubmit={(e)=>{ e.preventDefault(); alert('signup placeholder'); }} className="form-container">
        <section className="field">
            <label>Username<input name="username" /></label>
        </section>
        <section className="field">
            <label>Password<input name="password" type="password" /></label>
        </section>
        <button type="submit" className="btn">Create account</button>
      </form>
    </section>
  );
}