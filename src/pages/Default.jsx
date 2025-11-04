import React from "react";
import "../Styling/Login.css";

export default function Default() {
  const goToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <section
      className="login-container"
      role="button"
      tabIndex={0}
      onClick={goToLogin}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") goToLogin();
      }}
    >
      <aside className="hero">
        <img src="/img/SpotOnLogo.png" alt="SpotOn" className="hero-choice-img" />
      </aside>
    </section>
  );
}