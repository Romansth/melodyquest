import React, { useState, useEffect } from "react";
import "./WebPlayback.css";
import CountdownTimer from "../CountdownTimer/CountdownTimer";
import SetSinglePlayer from "./SetSinglePlayer";
import axios from "axios";

const WebPlayback = ({ selectedPlaylist, token, onRestart }) => {
  const [name, setName] = useState("");
  const [validName, setValidName] = useState(false);
  const [player, setPlayer] = useState(undefined);
  const [deviceId, setDeviceId] = useState(null);
  const [currentTrack, setCurrentTrack] = useState("");
  const [isPaused, setPaused] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [guess, setGuess] = useState("");
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [isInitTimerComplete, setInitTimerComplete] = useState(false);
  const [isGuessingStart, setGuessingStart] = useState(false);
  const [isGuessingEnd, setGuessingEnd] = useState(false);
  const [remainingTime, setRemainingTime] = useState(20);
  const [isOver, setIsOver] = useState(false);
  const [guesses, setGuesses] = useState([]);
  const serverUrl = process.env.REACT_APP_SERVER_URL; // Server URL from environment variables
  const totalRounds = 5;
  const durationMs = 20000;
  const pauseDurationMs = 5000;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    // Initialize Spotify Web Playback SDK
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Web Playback SDK",
        getOAuthToken: (cb) => {
          cb(token);
        },
        volume: 0.5,
      });

      setPlayer(player);

      player.addListener("ready", ({ device_id }) => setDeviceId(device_id));
      player.addListener("not_ready", ({ device_id }) =>
        console.error("Device ID has gone offline", device_id)
      );
      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        setPaused(state.paused);
        player.getCurrentState().then((state) => setPaused(!state));
      });

      player.connect();
    };
  }, [token]);

  useEffect(async () => {
    if (isGuessingEnd) {
      if (round < totalRounds) {
        setRound(round + 1);
        setGuessingEnd(false);
        setInitTimerComplete(false);
        setRemainingTime(20);
        setIsCorrect(null);
      } else {
        // Game over, send the score to the server
        setIsOver(true);
        try {
          const response = await axios.post(`${serverUrl}/api/add-score`, {
            name,
            score,
          });
        } catch (error) {
          console.error("Error:", error);
        }
      }
    }
  }, [isGuessingEnd, round, totalRounds]);

  // Function to transfer playback to the current device
  const transferPlaybackHere = async (token, deviceId) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to transfer playback");
    } catch (error) {
      console.error("Error transferring playback:", error);
    }
  };

  // Function to play a random segment of a track from the selected playlist
  const playRandomSegmentPlaylist = async (playlistId) => {
    await transferPlaybackHere(token, deviceId);

    try {
      const response = await fetch(
        `${serverUrl}/api/random-song?playlistName=${playlistId}`
      );

      if (!response.ok) throw new Error("Failed to fetch playlist tracks");

      const randomTrack = await response.json();

      setIsCorrect(null);
      setCurrentTrack(randomTrack.track_name);

      await playTrackSegment(randomTrack.track_uri);
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    }
  };

  // Function to play a specific segment of a track
  const playTrackSegment = async (trackUri) => {
    await playTrack(trackUri);
    player.seek(30000).then(() => {
      setTimeout(() => {
        setGuessingStart(true);
        player.pause();
      }, durationMs);
    });
  };

  // Function to play a track
  const playTrack = async (trackUri) => {
    try {
      await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: "PUT",
          body: JSON.stringify({ uris: [trackUri] }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };

  // Event handlers for guessing
  const handleGuessChange = (event) => setGuess(event.target.value);

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleGuessSubmit();
    }
  };

  const stripPunctuation = (text) =>
    text
      .replace(/[^\w\s]|_/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();

  const handleGuessSubmit = () => {
    const cleanedGuess = stripPunctuation(guess);
    const cleanedTrack = stripPunctuation(currentTrack);
    if (cleanedGuess === "") {
      setIsCorrect(false);
      setGuess("");
      return;
    }
    const guessContainedInTrack =
      cleanedTrack.length > 2 && cleanedTrack.includes(cleanedGuess);
    const correct = guessContainedInTrack || cleanedGuess === cleanedTrack;
    setIsCorrect(correct);
    setGuesses([...guesses, { guess: guess, correct: correct }]);
    if (correct) {
      setScore((prevScore) => prevScore + remainingTime);
      setTimeout(() => {
        setGuessingEnd(true);
      }, 3000);
    }
    setGuess("");
  };

  // Timer event handlers
  const handleTimerComplete = () => {
    setInitTimerComplete(true);
    playRandomSegmentPlaylist(selectedPlaylist);
  };

  const handleGuessTimerComplete = () => {
    setGuessingStart(false);
    setGuessingEnd(true);
  };

  const handleRemainingTime = (remainingTime) => {
    setRemainingTime(remainingTime);
  };

  const handleNothingStartTime = () => {};

  // Handler for setting up the player's name
  const handleSetup = ({ name }) => {
    setName(name);
    setValidName(true);
  };

  return (
    <div>
      {/* Render SetSinglePlayer component if name is not set else render the game */}
      {!validName ? (
        <SetSinglePlayer onSubmit={handleSetup} />
      ) : (
        <div className="content-single-player">
          <div className="round-info-singleplayer">
            <div className="round-singleplayer">
              <svg
                width="34"
                height="25"
                viewBox="0 0 64 64"
                xmlSpace="preserve"
                xmlns="http://www.w3.org/2000/svg"
                enable-background="new 0 0 64 64"
              >
                <path
                  d="m62.047 7.235-5.146-5.217c-1.297-1.314-3.559-1.314-4.855 0L46.9 7.235a3.491 3.491 0 0 0 0 4.882l.151.153-1.187 1.155c.075-.972-.238-1.97-.971-2.712-1.297-1.314-3.559-1.314-4.855 0-.943.956-1.203 2.333-.807 3.536-1.192-.371-2.572-.11-3.481.812a3.491 3.491 0 0 0 0 4.882 3.388 3.388 0 0 0 2.377 1.013L36.232 22.8l-.647-.656c-2.369-2.402-5.58-3.78-8.809-3.78-2.952 0-5.688 1.126-7.703 3.169-.32.325-.612.675-.888 1.037L6.746 2.756a3.465 3.465 0 0 0-1.86-1.559C4.062.916 3.217.988 2.5 1.402S1.297 2.514 1.131 3.365a3.462 3.462 0 0 0 .419 2.391l13.799 23.897c-1.03 1.855-2.914 3.055-5.078 3.212l-2.56.185-1.98 2.008c-6.263 6.35-6.262 15.924 0 22.272l.428.433 1.288 1.306c.234.237.503.42.785.577 2.752 2.166 5.99 3.354 9.32 3.354 4.068 0 7.992-1.705 11.046-4.802l1.976-2.001.04-.56 4.465 6.381c.451.645 1.147.999 1.843.999.343 0 .686-.086.998-.267h.001c.946-.547 1.285-1.763.788-2.828l-4.427-9.475-.936-1.621a6.33 6.33 0 0 1 2.71-1.132c2.267-.371 4.302-1.415 5.886-3.021 4.313-4.373 4.102-11.71-.415-16.489l1.813-1.917c.017.86.343 1.715.989 2.37a3.385 3.385 0 0 0 2.428 1.019c.917 0 1.779-.361 2.427-1.019.936-.949 1.198-2.314.815-3.51.335.109.684.18 1.046.18.918 0 1.779-.361 2.428-1.018v-.001a3.488 3.488 0 0 0 0-4.882c-.723-.733-1.747-1.041-2.737-.955l1.182-1.25.131.133c.648.655 1.511 1.017 2.428 1.017s1.779-.361 2.428-1.018l5.146-5.217a3.494 3.494 0 0 0-.004-4.881zM25.794 35.748l10.409-10.13.57.578-10.405 10.547-.574-.995zm1.611 2.791 10.772-10.92.575.583-10.753 11.365-.594-1.028zm12.177-12.343 10.603-10.748.325.33-10.382 10.971-.546-.553zm1.88-14.079a1.407 1.407 0 0 1 2.008 0 1.481 1.481 0 0 1 0 2.073 1.437 1.437 0 0 1-2.008 0 1.48 1.48 0 0 1 0-2.073zm-4.288 4.348a1.403 1.403 0 0 1 2.007 0 1.483 1.483 0 0 1 0 2.073c-.537.545-1.47.545-2.007 0a1.481 1.481 0 0 1 0-2.073zm4.244-.033c.336.109.685.181 1.047.181.046 0 .09-.012.136-.013l-1.01.982a3.471 3.471 0 0 0-.173-1.15zm7.037-2.738.325.33-10.603 10.748-.542-.549 10.82-10.529zm-27.958 9.243c1.637-1.659 3.867-2.573 6.279-2.573 2.697 0 5.389 1.161 7.385 3.185l.637.646-10.036 9.767-5.458-9.453c.345-.566.73-1.103 1.193-1.572zM7.154 36.462l1.451-1.471 1.811-.132a8.276 8.276 0 0 0 6.05-3.272l3.884 6.727-.029-.03L5.013 53.18C1.737 47.844 2.44 41.241 7.154 36.462zm2.107 21.46c-.178-.146-.351-.3-.525-.456l14.301-14.498.661 1.145-12.821 13.551c-.425.431-1.089.507-1.616.258zM7.3 56.073l-.146-.148c-.419-.424-.565-1.085-.6-1.455L21.36 40.062l.64 1.109L7.3 56.073zm21.329-.755-1.456 1.476C24.498 59.506 21.08 61 17.551 61c-2.051 0-4.019-.506-5.846-1.459.216-.139.423-.297.61-.487L24.742 45.92l4.07 7.048a8.397 8.397 0 0 0-.052.503l-.131 1.847zm8.266 5.45c.057.122.039.217.023.247-.035-.002-.125-.034-.202-.144l-5.899-8.424L3.282 4.756a1.486 1.486 0 0 1-.189-1.007c.032-.159.126-.452.407-.614a.786.786 0 0 1 .399-.104c.137 0 .257.03.337.058.312.107.595.35.777.667L32.508 51.37l4.387 9.398zm3.621-17.499c-1.284 1.302-2.939 2.149-4.785 2.451a8.324 8.324 0 0 0-3.392 1.365l-3.296-5.71 11.104-11.736c3.709 4.004 3.904 10.046.369 13.63zm7.242-16.037c-.538.546-1.471.544-2.007 0a1.481 1.481 0 0 1 0-2.073 1.404 1.404 0 0 1 2.007 0 1.481 1.481 0 0 1 0 2.073zm4.288-6.42a1.48 1.48 0 0 1 0 2.072v.001c-.537.544-1.47.546-2.007 0a1.483 1.483 0 0 1 0-2.073 1.402 1.402 0 0 1 2.007 0zm-4.237 2.132a3.585 3.585 0 0 0-1.172-.164l.994-1.051c-.014.412.048.821.178 1.215zm12.814-12.231-5.146 5.216c-.537.547-1.471.546-2.008.001l-.179-.181-4.807-4.873-.16-.162a1.483 1.483 0 0 1 0-2.073l5.146-5.217a1.402 1.402 0 0 1 2.009-.001l5.146 5.217a1.482 1.482 0 0 1-.001 2.073z"
                  fill="#ffffff"
                  className="fill-3f3a34"
                ></path>
              </svg>
              Round: {round}/{totalRounds}
            </div>
            <div className="players-singleplayer">
              <p>{name}</p>
              <p className="score-singleplayer">
                <span className="score-superscript-svg-singleplayer">
                  <svg
                    width="34"
                    height="25"
                    viewBox="0 0 34 45"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.79725 35.0902C11.1968 33.5898 12.5467 35.7114 12.5467 35.7114L10.1119 10.161C10.1477 9.64364 11.6826 8.94618 18.8563 5.57908C26.03 2.21197 29.2258 0.803046 29.9146 1.14814C30.7914 9.08138 32.5856 26.6263 32.847 28.3109C33.1737 30.4165 31.3458 31.6855 29.5946 32.5633C26.7276 34.0005 21.9462 33.312 20.8149 31.5444C20.0408 30.335 19.7851 27.7421 22.2542 25.4687C24.2296 23.6499 28.4028 24.3914 30.2426 24.9894L28.8771 10.5809L13.1932 18.0908L15.1436 40.5789C14.8826 41.511 12.039 43.9531 7.32853 43.9458C4.44353 43.9414 2.82329 42.3485 2.36228 41.3457C2.00745 39.8857 2.3977 36.5907 6.79725 35.0902Z"
                      fill="white"
                    />
                    <path
                      d="M15.1436 40.5789C14.8826 41.511 12.039 43.9531 7.32853 43.9458C4.44353 43.9414 2.82329 42.3485 2.36228 41.3457C2.00745 39.8857 2.3977 36.5907 6.79725 35.0902C11.1968 33.5898 12.5467 35.7114 12.5467 35.7114L10.1119 10.161C10.1477 9.64364 11.6826 8.94618 18.8563 5.57908C26.03 2.21197 29.2258 0.803046 29.9146 1.14814C30.7914 9.08138 32.5856 26.6263 32.847 28.3109C33.1737 30.4165 31.3458 31.6855 29.5946 32.5633C26.7276 34.0005 21.9462 33.312 20.8149 31.5444C20.0408 30.335 19.7851 27.7421 22.2542 25.4687C24.2296 23.6499 28.4028 24.3914 30.2426 24.9894L28.8771 10.5809L13.1932 18.0908L15.1436 40.5789ZM15.1436 40.5789C15.3912 39.6946 14.4477 43.0645 15.1436 40.5789Z"
                      stroke="white"
                    />
                  </svg>
                </span>
                <span className="score-singleplayer">{score}</span>
                <span className="score-superscript-svg-singleplayer">
                  <svg
                    width="34"
                    height="25"
                    viewBox="0 0 34 45"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.79725 35.0902C11.1968 33.5898 12.5467 35.7114 12.5467 35.7114L10.1119 10.161C10.1477 9.64364 11.6826 8.94618 18.8563 5.57908C26.03 2.21197 29.2258 0.803046 29.9146 1.14814C30.7914 9.08138 32.5856 26.6263 32.847 28.3109C33.1737 30.4165 31.3458 31.6855 29.5946 32.5633C26.7276 34.0005 21.9462 33.312 20.8149 31.5444C20.0408 30.335 19.7851 27.7421 22.2542 25.4687C24.2296 23.6499 28.4028 24.3914 30.2426 24.9894L28.8771 10.5809L13.1932 18.0908L15.1436 40.5789C14.8826 41.511 12.039 43.9531 7.32853 43.9458C4.44353 43.9414 2.82329 42.3485 2.36228 41.3457C2.00745 39.8857 2.3977 36.5907 6.79725 35.0902Z"
                      fill="white"
                    />
                    <path
                      d="M15.1436 40.5789C14.8826 41.511 12.039 43.9531 7.32853 43.9458C4.44353 43.9414 2.82329 42.3485 2.36228 41.3457C2.00745 39.8857 2.3977 36.5907 6.79725 35.0902C11.1968 33.5898 12.5467 35.7114 12.5467 35.7114L10.1119 10.161C10.1477 9.64364 11.6826 8.94618 18.8563 5.57908C26.03 2.21197 29.2258 0.803046 29.9146 1.14814C30.7914 9.08138 32.5856 26.6263 32.847 28.3109C33.1737 30.4165 31.3458 31.6855 29.5946 32.5633C26.7276 34.0005 21.9462 33.312 20.8149 31.5444C20.0408 30.335 19.7851 27.7421 22.2542 25.4687C24.2296 23.6499 28.4028 24.3914 30.2426 24.9894L28.8771 10.5809L13.1932 18.0908L15.1436 40.5789ZM15.1436 40.5789C15.3912 39.6946 14.4477 43.0645 15.1436 40.5789Z"
                      stroke="white"
                    />
                  </svg>
                </span>
              </p>
            </div>
          </div>
          <div className="lyrics-section-singleplayer">
            <div className="time-remaining-singleplayer">
              <span className="superscript-svg-singleplayer">
                <svg
                  width="26"
                  height="67"
                  viewBox="0 0 26 67"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M8.5 63C9.03362 63.9948 10.5 64.5878 12.6568 63.9523C16.1225 62.9312 16.95 60.3127 16.7317 57.9106C16.5571 55.989 16.0768 51.7234 15.7858 49.8308C14.3062 50.2191 11.0512 50.5039 9.38236 50.1948C7.41769 49.8308 3.70663 48.5934 2.39684 46.5553C0.291821 43.2797 0.423025 39.4191 0.650461 37.6748C0.868757 36.0006 2.50457 30.428 5.59854 27.0473C7.96343 24.4632 9.98875 21.8185 10.7649 20.7509V14.964C10.7164 13.9692 11.2361 11.7819 12.0747 10.0142C13.0934 7.86686 16.7317 3.20824 16.8773 2.84429C16.9937 2.55312 18.0415 1.14583 18.3568 0.587769C19.2057 0.636296 20.5122 1.37083 21.0249 2.22556C21.6798 3.31743 22.4438 4.62767 22.9168 7.10256C23.3751 9.50061 20.8794 14.3817 19.7151 16.4198C18.7936 18.033 15.1309 21.3938 13.8211 23.2621L14.6943 29.1582C16.4164 28.9884 18.9875 28.8671 20.4428 29.1582C22.2651 29.5228 23.5721 31.8812 24.2266 33.0161C24.7723 33.9624 25.9355 36.153 25.5 38.7666C25.027 41.6055 24.2266 45.0266 21.3887 46.9192C20.3409 47.618 18.5266 48.5691 17.7504 48.9574L18.9875 57.9106C19.23 59.2451 19.1492 62.3445 17.7504 63.8125C16.5094 65.115 14 67.5878 8.76386 66.5C4.972 65.7122 4.38226 62.1041 4.14322 61.1134C3.88854 60.058 3.5 58.5 4.14322 56.9644C4.94711 55.0451 6.17603 53.9083 7.52684 53.5796C8.87301 53.252 10.6194 52.5969 12.6568 54.999C14.6943 57.4011 13 60 11.82 61.1134C10.6635 62.2047 8.5 63 8.5 63ZM13.0934 14.964C12.6568 17.3297 13.1056 18.373 13.3481 18.4943C14.2456 17.2812 16.2835 15.1736 16.8773 14.3817C17.7504 13.217 18.0808 11.8364 18.3568 10.4048C18.4599 9.86989 18.3568 9.22687 18.3568 8.99512C18.3568 8.08524 18.1385 7.24814 17.7504 6.66581L15.7858 8.99512C15.1309 9.89288 13.5806 12.3242 13.0934 14.964ZM12.6568 29.8861L12.0747 25.3731C11.5168 26.1495 8.93458 28.9854 8.36588 29.595C7.79718 30.2045 6.14428 32.2154 5.59854 33.2345C4.89401 34.5501 4.16382 36.0451 3.94849 37.7192C3.82758 38.6592 3.70663 39.6918 3.70663 40.1497C3.70663 41.5327 4.21646 42.7232 5.03757 44.0667C5.2781 44.4603 5.43911 44.8237 5.59854 45.0266C6.39896 46.0457 9.38237 47.1376 10.7649 47.2832C11.871 47.3996 14.2819 47.1376 15.3492 46.9192L14.6943 43.2797C14.4032 40.5864 13.9521 35.5555 13.0207 35.6719C12.0712 35.7906 11.387 36.3914 11.0249 37.6748C10.943 37.9651 10.8589 38.4712 10.7649 38.7666C10.3574 40.0477 11.4683 40.6592 12.0747 40.8048H14.1849C13.4815 41.1445 12.0727 42.2897 11.0249 42.4062C9.71511 42.5518 8.36588 42.2242 7.41769 39.8585C6.71987 38.1175 7.59615 35.959 8.36588 34.5145C8.47467 34.3103 8.57361 34.1247 8.65471 33.9624C9.17862 32.9142 11.5411 30.8081 12.6568 29.8861ZM17.2411 46.0457L15.7858 34.5145C15.5675 34.3689 16.6226 34.1808 17.2411 34.1808C18.5575 34.1808 19.2972 34.2977 20.0062 35.0543C20.4729 35.5523 20.7702 36.0734 21.0249 36.5829C21.3292 37.1916 21.407 38.9927 21.1858 40.7793C21.0995 41.4767 20.8947 42.0943 20.7338 42.4062C20.1517 43.5344 18.5024 45.2208 17.2411 46.0457Z"
                    fill="white"
                  />
                </svg>
              </span>

              {isInitTimerComplete && !isOver ? (
                <span className="remaining-text-singleplayer">
                  <CountdownTimer
                    seconds={17}
                    onTick={handleRemainingTime}
                    onComplete={handleGuessTimerComplete}
                  />
                </span>
              ) : (
                <span className="remaining-text-singleplayer">0</span>
              )}

              <span className="superscript-svg-singleplayer">
                <svg
                  width="26"
                  height="67"
                  viewBox="0 0 26 67"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M8.5 63C9.03362 63.9948 10.5 64.5878 12.6568 63.9523C16.1225 62.9312 16.95 60.3127 16.7317 57.9106C16.5571 55.989 16.0768 51.7234 15.7858 49.8308C14.3062 50.2191 11.0512 50.5039 9.38236 50.1948C7.41769 49.8308 3.70663 48.5934 2.39684 46.5553C0.291821 43.2797 0.423025 39.4191 0.650461 37.6748C0.868757 36.0006 2.50457 30.428 5.59854 27.0473C7.96343 24.4632 9.98875 21.8185 10.7649 20.7509V14.964C10.7164 13.9692 11.2361 11.7819 12.0747 10.0142C13.0934 7.86686 16.7317 3.20824 16.8773 2.84429C16.9937 2.55312 18.0415 1.14583 18.3568 0.587769C19.2057 0.636296 20.5122 1.37083 21.0249 2.22556C21.6798 3.31743 22.4438 4.62767 22.9168 7.10256C23.3751 9.50061 20.8794 14.3817 19.7151 16.4198C18.7936 18.033 15.1309 21.3938 13.8211 23.2621L14.6943 29.1582C16.4164 28.9884 18.9875 28.8671 20.4428 29.1582C22.2651 29.5228 23.5721 31.8812 24.2266 33.0161C24.7723 33.9624 25.9355 36.153 25.5 38.7666C25.027 41.6055 24.2266 45.0266 21.3887 46.9192C20.3409 47.618 18.5266 48.5691 17.7504 48.9574L18.9875 57.9106C19.23 59.2451 19.1492 62.3445 17.7504 63.8125C16.5094 65.115 14 67.5878 8.76386 66.5C4.972 65.7122 4.38226 62.1041 4.14322 61.1134C3.88854 60.058 3.5 58.5 4.14322 56.9644C4.94711 55.0451 6.17603 53.9083 7.52684 53.5796C8.87301 53.252 10.6194 52.5969 12.6568 54.999C14.6943 57.4011 13 60 11.82 61.1134C10.6635 62.2047 8.5 63 8.5 63ZM13.0934 14.964C12.6568 17.3297 13.1056 18.373 13.3481 18.4943C14.2456 17.2812 16.2835 15.1736 16.8773 14.3817C17.7504 13.217 18.0808 11.8364 18.3568 10.4048C18.4599 9.86989 18.3568 9.22687 18.3568 8.99512C18.3568 8.08524 18.1385 7.24814 17.7504 6.66581L15.7858 8.99512C15.1309 9.89288 13.5806 12.3242 13.0934 14.964ZM12.6568 29.8861L12.0747 25.3731C11.5168 26.1495 8.93458 28.9854 8.36588 29.595C7.79718 30.2045 6.14428 32.2154 5.59854 33.2345C4.89401 34.5501 4.16382 36.0451 3.94849 37.7192C3.82758 38.6592 3.70663 39.6918 3.70663 40.1497C3.70663 41.5327 4.21646 42.7232 5.03757 44.0667C5.2781 44.4603 5.43911 44.8237 5.59854 45.0266C6.39896 46.0457 9.38237 47.1376 10.7649 47.2832C11.871 47.3996 14.2819 47.1376 15.3492 46.9192L14.6943 43.2797C14.4032 40.5864 13.9521 35.5555 13.0207 35.6719C12.0712 35.7906 11.387 36.3914 11.0249 37.6748C10.943 37.9651 10.8589 38.4712 10.7649 38.7666C10.3574 40.0477 11.4683 40.6592 12.0747 40.8048H14.1849C13.4815 41.1445 12.0727 42.2897 11.0249 42.4062C9.71511 42.5518 8.36588 42.2242 7.41769 39.8585C6.71987 38.1175 7.59615 35.959 8.36588 34.5145C8.47467 34.3103 8.57361 34.1247 8.65471 33.9624C9.17862 32.9142 11.5411 30.8081 12.6568 29.8861ZM17.2411 46.0457L15.7858 34.5145C15.5675 34.3689 16.6226 34.1808 17.2411 34.1808C18.5575 34.1808 19.2972 34.2977 20.0062 35.0543C20.4729 35.5523 20.7702 36.0734 21.0249 36.5829C21.3292 37.1916 21.407 38.9927 21.1858 40.7793C21.0995 41.4767 20.8947 42.0943 20.7338 42.4062C20.1517 43.5344 18.5024 45.2208 17.2411 46.0457Z"
                    fill="white"
                  />
                </svg>
              </span>
            </div>

            {!isInitTimerComplete ? (
              <div className="countdown-timer-singleplayer">
                <CountdownTimer
                  seconds={5}
                  onTick={handleNothingStartTime}
                  onComplete={handleTimerComplete}
                />
              </div>
            ) : (
              <div>
                {remainingTime < 2 ? (
                  <div className="playing-now-singleplayer">{currentTrack}</div>
                ) : (
                  <div className="playing-now-singleplayer">
                    <div class="vinyl-singleplayer">
                      <svg
                        version="1.0"
                        xmlns="http://www.w3.org/2000/svg"
                        width="250pt"
                        height="250pt"
                        viewBox="0 0 512.000000 512.000000"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <g
                          transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
                          fill="#000000"
                          stroke="none"
                        >
                          <path
                            d="M2330 5110 c-494 -48 -950 -230 -1350 -538 -195 -150 -448 -432 -594
                            -662 -63 -99 -186 -351 -230 -471 -49 -134 -102 -340 -128 -499 -31 -195 -31
                            -565 0 -760 45 -276 116 -498 237 -745 132 -269 269 -460 489 -681 221 -220
                            412 -357 681 -489 247 -121 469 -192 745 -237 195 -31 565 -31 760 0 159 26
                            365 79 499 128 120 44 372 167 471 230 321 204 620 503 824 824 63 99 186 351
                            230 471 264 721 183 1552 -215 2200 l-59 96 0 536 0 535 -26 31 c-32 38 -80
                            49 -123 27 -61 -32 -61 -35 -61 -464 l0 -389 -127 126 c-395 390 -874 628
                            -1438 716 -117 18 -463 27 -585 15z m534 -226 c486 -60 963 -291 1329 -643 63
                            -60 190 -205 250 -285 l37 -49 0 -811 0 -811 -268 -268 -267 -267 -70 71 c-85
                            86 -115 103 -164 94 -31 -6 -83 -54 -350 -318 -172 -172 -326 -330 -342 -351
                            -20 -27 -29 -51 -29 -78 0 -35 8 -47 81 -123 l82 -85 -82 -85 c-73 -77 -81
                            -88 -81 -124 0 -78 81 -132 146 -98 16 9 60 47 99 86 l69 71 81 -80 c83 -81
                            114 -97 162 -86 39 10 710 682 715 716 7 49 -12 85 -89 162 l-78 78 298 298
                            297 298 1 664 1 665 30 -65 c71 -151 140 -411 169 -630 18 -138 15 -431 -5
                            -575 -50 -353 -167 -672 -354 -965 -161 -253 -449 -541 -702 -702 -226 -144
                            -507 -262 -757 -317 -185 -41 -302 -53 -513 -53 -275 0 -467 29 -713 108 -371
                            120 -663 300 -942 579 -279 279 -459 571 -579 942 -79 246 -108 438 -108 713
                            0 275 29 467 108 713 120 371 300 663 579 942 226 226 452 381 727 499 399
                            170 793 224 1232 170z m901 -3744 l-245 -245 -137 138 -138 137 245 245 245
                            245 137 -137 138 -138 -245 -245z"
                          />
                          <path
                            d="M2425 4473 c-442 -34 -821 -196 -1153 -493 -105 -93 -122 -133 -82
                            -197 22 -37 69 -54 113 -42 16 5 58 34 94 66 231 206 466 335 736 404 115 29
                            173 38 326 49 140 11 170 20 192 61 16 31 14 83 -6 112 -28 43 -77 52 -220 40z"
                          />
                          <path
                            d="M2455 3620 c-466 -46 -842 -388 -940 -855 -22 -106 -22 -304 0 -410
                            91 -432 408 -749 840 -840 161 -34 386 -19 550 37 306 105 558 357 663 663 73
                            215 73 475 0 690 -89 261 -285 483 -533 607 -177 89 -384 127 -580 108z m362
                            -249 c107 -35 136 -49 218 -104 168 -113 281 -270 346 -477 20 -65 24 -96 24
                            -230 0 -165 -12 -226 -71 -357 -74 -168 -249 -343 -418 -418 -130 -58 -191
                            -70 -356 -70 -165 0 -226 12 -356 70 -169 75 -344 250 -418 418 -59 131 -71
                            192 -71 357 0 134 4 165 24 230 34 108 64 171 121 254 113 164 271 277 465
                            334 99 29 114 31 265 27 119 -3 146 -7 227 -34z"
                          />
                          <path
                            d="M2472 2754 c-84 -43 -126 -116 -120 -208 4 -71 34 -123 95 -164 33
                            -23 48 -27 113 -27 65 0 80 4 113 27 22 14 51 43 65 65 23 33 27 48 27 113 0
                            65 -4 80 -27 113 -43 63 -92 91 -168 95 -46 2 -75 -2 -98 -14z"
                          />
                        </g>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isInitTimerComplete && !isOver ? (
              <div className="guess-input-singleplayer">
                <input
                  type="text"
                  value={guess}
                  onChange={handleGuessChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your guess"
                />
                <button onClick={handleGuessSubmit}>Submit Guess</button>
              </div>
            ) : (
              <div className="guess-input-singleplayer">
                <button onClick={onRestart}>Restart</button>
              </div>
            )}
          </div>

          <div className="guesses-singleplayer">
            <p className="guess-title-singleplayer">Guesses Here</p>

            {guesses.map((item, index) => (
              <p>
                <div
                  className={item.correct ? "correct-guess" : "incorrect-guess"}
                >
                  {item.guess}
                </div>
              </p>
            ))}

            {isCorrect !== null && (
              <div className={isCorrect ? "correct-guess" : "incorrect-guess"}>
                {isCorrect ? "Correct Guess!" : "Incorrect Guess, try again!"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebPlayback;
