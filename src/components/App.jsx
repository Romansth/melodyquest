import React, { useState, useEffect } from "react";
import WebPlayback from "./WebPlayback/WebPlayback";
import SelectChallenge from "./SelectChallenge/SelectChallenge";
import "./App.css";
import Login from "./Login/Login";
import ChoosePlayType from "./ChoosePlayType/ChoosePlayType";
import Multiplayer from "./Multiplayer/Multiplayer";
import Header from "./Shared/Header";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [start, setStart] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [token, setToken] = useState("");
  const [isSinglePlayer, setIsSinglePlayer] = useState(false);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const serverUrl = process.env.REACT_APP_SERVER_URL; // Server URL from environment variables

  // useEffect to handle login state and token refresh
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");

    if (accessToken) {
      setToken(accessToken); // Set token from URL parameter
      setLoggedIn(true); 
    } else {
      refreshAccessToken(); // Refresh token if not found
    }

    // Set up interval to refresh token periodically
    const interval = setInterval(refreshAccessToken, 3600 * 1000);
    return () => clearInterval(interval); // Clean up interval on component unmount
  }, []);

  // Function to refresh the access token
  const refreshAccessToken = async () => {
    try {
      const response = await fetch(`${serverUrl}/refresh_token`);
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

  // Function to handle Spotify login
  const handleSpotifyLogin = () => {
    window.location.href = `${serverUrl}/auth/login`; // Redirect to Spotify login
  };

  // Function to handle playlist selection
  const handlePlaylistSelect = (singerId) => {
    setSelectedPlaylist(singerId); 
    setStart(true); 
  };

  // Function to handle restart action
  const handleRestart = () => {
    setStart(false); 
    setSelectedPlaylist(null); 
  };

  // Function to handle token setting
  const handleTokenSet = (newToken) => {
    setToken(newToken); 
  };

  // Function to handle single player mode selection
  const handleSinglePlayer = () => {
    setIsSinglePlayer(true); // Set single player state to true
  };

  // Function to handle multiplayer mode selection
  const handleMultiPlayer = () => {
    setIsMultiplayer(true); 
  };

  return (
    <div className="container">
      <Header />
      <div className="horizontal-line"></div>

      {/* Render login component if not logged in */}
      {!loggedIn && (
        <div>
          <Login onSpotifyLogin={handleSpotifyLogin} />
        </div>
      )}

      {/* Render playlist selection component if logged in and not started */}
      {loggedIn && !start && (
        <SelectChallenge onPlaylistSelect={handlePlaylistSelect} />
      )}

      {/* Render play type selection if logged in, started, and no play type selected */}
      {loggedIn && start && !isSinglePlayer && !isMultiplayer && (
        <div>
          <ChoosePlayType
            onSinglePlayer={handleSinglePlayer}
            onMultiplayer={handleMultiPlayer}
          />
        </div>
      )}

      {/* Render multiplayer component if in multiplayer mode */}
      {isMultiplayer && loggedIn && start && (
        <div>
          <Multiplayer
            selectedPlaylist={selectedPlaylist}
            onRestart={handleRestart}
          />
        </div>
      )}

      {/* Render single player component if in single player mode */}
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
