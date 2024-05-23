import React from "react";
import "./login.css";

const Login = ({ onGuestLogin, onSpotifyLogin }) => {
  return (
    <div className="start-page">
      <h1 className="title">MelodyQuest - Guess the Song Challenge</h1>
      <button className="login-button guest-login" onClick={onGuestLogin}>
        Guest Login
      </button>
      <button className="login-button spotify-login" onClick={onSpotifyLogin}>
        Login with Spotify
      </button>
    </div>
  );
};

export default Login;
