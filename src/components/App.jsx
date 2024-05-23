import React, { useState, useEffect } from "react";
import WebPlayback from "./WebPlayback/WebPlayback";
import SelectChallenge from "./SelectChallenge/SelectChallenge";
import "./App.css";
import Login from "./Login/Login";
import ChoosePlayType from "./ChoosePlayType/ChoosePlayType";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [start, setStart] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [token, setToken] = useState("");
  const [isSinglePlayer, setIsSinglePlayer] = useState(false);
  const [isMultiplayer, setIsMultiplayer] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");

    if (accessToken) {
      setToken(accessToken);
      setLoggedIn(true);
    } else {
      refreshAccessToken();
    }

    // Automatically refresh the token periodically
    const interval = setInterval(refreshAccessToken, 3600 * 1000); // Refresh every hour
    return () => clearInterval(interval);
  }, []);

  const refreshAccessToken = async () => {
    try {
      const response = await fetch("http://localhost:5030/refresh_token");
      const data = await response.json();
      if (data.access_token) {
        setToken(data.access_token);
        setLoggedIn(true);
      } else {
        console.error("Failed to refresh access token");
      }
    } catch (error) {
      console.error("Error refreshing access token:", error);
    }
  };

  const handleGuestLogin = () => {
    window.location.href = "http://localhost:5030/auth/login";
  };

  const handleSpotifyLogin = () => {
    window.location.href = "http://localhost:5030/auth/login";
  };

  const handlePlaylistSelect = (playlistUri) => {
    setSelectedPlaylist(playlistUri);
    setStart(true);
  };

  const handleRestart = () => {
    setStart(false);
    setSelectedPlaylist(null);
  };

  const handleTokenSet = (newToken) => {
    setToken(newToken);
  };

  const handleSinglePlayer = () => {
    setIsSinglePlayer(true);
  };

  const handleMultiPlayer = () => {
    setIsMultiplayer(true);
  };

  return (
    <div className="app-container">
      {!loggedIn && (
        <div>
          <Login
            onGuestLogin={handleGuestLogin}
            onSpotifyLogin={handleSpotifyLogin}
          />
        </div>
      )}

      {loggedIn && !start && (
        <div>
          <h1 className="title">Guess the Song Challenge</h1>
          <div className="start-button-container">
            <SelectChallenge onPlaylistSelect={handlePlaylistSelect} />
          </div>
        </div>
      )}

      {loggedIn && start && !isSinglePlayer && !isMultiplayer && (
        <div>
          <ChoosePlayType
            onSinglePlayer={handleSinglePlayer}
            onMultiplayer={handleMultiPlayer}
          />
        </div>
      )}

      {isSinglePlayer && loggedIn && start && (
        <WebPlayback
          selectedPlaylist={selectedPlaylist}
          token={token}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

export default App;
