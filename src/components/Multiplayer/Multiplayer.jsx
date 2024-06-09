import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import SetMultiplayer from "./SetMultiplayer";
import Lyrics from "./Lyrics";
import CountdownTimer from "../CountdownTimer/CountdownTimer";
import "./Multiplayer.css";

const Multiplayer = ({ selectedPlaylist, onRestart }) => {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [validName, setValidName] = useState(false);
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const socket = useRef(null);
  const [multiCurrentTrack, setMultiCurrentTrack] = useState("");
  const [multiCurrentArtist, setMultiCurrentArtist] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [lyrics, setLyrics] = useState("");
  const [scores, setScores] = useState([]);
  const [isInitTimerComplete, setIsInitTimerComplete] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [remainingTime, setRemainingTime] = useState(20);
  const [isGuessingEnd, setGuessingEnd] = useState(false);
  const [round, setRound] = useState(1);
  const totalRounds = 5;
  const durationMs = 15000;
  const pauseDurationMs = 5000;
  const serverUrl = process.env.REACT_APP_SERVER_URL;

  useEffect(() => {
    // Event listeners for socket.io events
    socket.current = io(`${serverUrl}`, {
      transports: ["websocket", "polling"],
    });

    socket.current.on("connect", () => {
      console.log("Connected to server");
    });

    socket.current.on("users", (users) => {
      setUsers(users);

      if (users.length > 0 && users[0].id === socket.current.id) {
        setIsAdmin(true);
      }
    });

    socket.current.on("guesses", (guessData) => {
      setGuesses((prevGuesses) => [...prevGuesses, guessData]);
    });

    socket.current.on("lyrics", (fetchedLyrics) => {
      setLyrics(fetchedLyrics);
    });

    socket.current.on("track", ({ track, artist }) => {
      setMultiCurrentTrack(track);
      setMultiCurrentArtist(artist);
    });

    socket.current.on("roomStartStatus", (status) => {
      setIsStarted(true);
    });

    socket.current.on("notification", (notif) => {
      console.log("Notification received:", notif);
    });

    socket.current.on("scores", (updatedScores) => {
      setScores(updatedScores);
    });

    socket.current.on("InitTimerStatus", (status) => {
      setIsInitTimerComplete(status);
    });

    socket.current.on("GuessTimerStatus", (guessstatus) => {
      setGuessingEnd(guessstatus);
    });

    socket.current.on("OverStatus", (overstatus) => {
      setIsOver(overstatus);
    });

    socket.current.on("disconnect", () => {});

    return () => {
      if (socket.current) {
        socket.current.off("connect");
        socket.current.off("users");
        socket.current.off("guesses");
        socket.current.off("lyrics");
        socket.current.off("track");
        socket.current.off("roomStartStatus");
        socket.current.off("notification");
        socket.current.off("scores");
        socket.current.off("InitTimerStatus");
        socket.current.off("GuessTimerStatus");
        socket.current.off("OverStatus");
        socket.current.off("disconnect");
        socket.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (isGuessingEnd) {
      if (round < totalRounds) {
        setRound((prevRound) => prevRound + 1);
        const guessstatus = false;
        socket.current.emit(
          "sendGuessTimerStatus",
          { guessstatus, room },
          () => {}
        );
        const status = false;
        socket.current.emit("sendInitTimerStatus", { status, room }, () => {});
        setRemainingTime(20);
        setIsCorrect(null);
        handleStart();
      } else {
        const overstatus = true;
        socket.current.emit("sendOverStatus", { overstatus, room }, () => {});
      }
    }
  }, [isGuessingEnd]);

  //Function to fetch a random song
  const getRandomSong = async () => {
    try {
      const response = await fetch(
        `${serverUrl}/api/random-song?playlistName=${selectedPlaylist}`
      );
      if (!response.ok) throw new Error("Failed to fetch playlist tracks");
      const randomTrack = await response.json();
      return randomTrack;
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    }
  };

  //Function to handle room details states
  const handleSetup = ({ name, room }) => {
    setName(name);
    setRoom(room);
    setValidName(true);

    socket.current.emit("login", { name, room }, (error) => {
      if (error) {
        console.log("Login error:", error);
      } else {
        console.log(`Welcome to room ${room}`);
      }
    });
  };

  //Function to handle start of the game
  const handleStart = async () => {
    if (isAdmin) {
      await getRandomSong();
      const trackDetails = await getRandomSong();
      if (trackDetails) {
        socket.current.emit("startLyrics", {
          track: trackDetails.track_name,
          artist: trackDetails.primary_artist,
          room,
        });
      }
    }
  };

  //Guess handlers
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
    const cleanedTrack = stripPunctuation(multiCurrentTrack);
    if (cleanedGuess === "") {
      setIsCorrect(false);
      setGuess("");
      return;
    }

    const guessContainedInTrack =
      cleanedTrack.length > 2 && cleanedTrack.includes(cleanedGuess);
    const correct = guessContainedInTrack || cleanedGuess === cleanedTrack;
    setIsCorrect(correct);

    handleSendGuess(correct);

    if (correct) {
      socket.current.emit("correctGuess", { name, room, remainingTime });
    }

    setGuess("");
  };

  const handleSendGuess = (correct) => {
    if (!correct) {
      socket.current.emit("sendGuess", guess, () => {});
    } else {
      socket.current.emit("sendGuess", "Correct guess", () => {});
    }
  };

  //Timer handlers
  const handleInitTimerComplete = async () => {
    const status = true;
    socket.current.emit("sendInitTimerStatus", { status, room }, () => {});
  };

  const handleNothingStartTime = () => {};

  const handleRemainingTime = (remainingTime) => {
    setRemainingTime(remainingTime);
  };

  const handleGuessTimerComplete = () => {
    const guessstatus = true;
    socket.current.emit(
      "sendGuessTimerStatus",
      { guessstatus, room },
      () => {}
    );
  };

  return (
    <div className="multiplayer-container">
      {/* Render SetMultiplayer component if name is not set else render the game */}
      {!validName && <SetMultiplayer onSubmit={handleSetup} />}
      {validName && (
        <div className="multiplayer-content">
          <div className="round-info">
            <div className="round">
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
              Round {round}
            </div>

            <div className="players">
              <div className="player">
                <p>Room: {room}</p>
              </div>
              {scores.map((userScore, index) => (
                <div className="player">
                  <p>{userScore.name}</p>
                  <p className="score">
                    <span className="score-superscript-svg">
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
                    <span className="score">{userScore.score}</span>
                    <span className="score-superscript-svg">
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
              ))}
            </div>
          </div>
          <div className="lyrics-section">
            <div className="time-remaining">
              <span className="superscript-svg">
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
              <span className="remaining-text">
                {isStarted && isInitTimerComplete ? (
                  <CountdownTimer
                    seconds={durationMs / 1000}
                    onTick={handleRemainingTime}
                    onComplete={handleGuessTimerComplete}
                  />
                ) : (
                  15
                )}
              </span>
              <span className="superscript-svg">
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

            <div className="lyrics">
              {isStarted && !isInitTimerComplete && !isOver && (
                <div className="countdown-timer">
                  <CountdownTimer
                    seconds={5}
                    onTick={handleNothingStartTime}
                    onComplete={handleInitTimerComplete}
                  />
                </div>
              )}

              {isStarted &&
                isInitTimerComplete &&
                !isOver &&
                remainingTime > 2 && <Lyrics lyrics={lyrics} />}

              {isStarted &&
                isInitTimerComplete &&
                !isOver &&
                remainingTime < 2 && (
                  <div className="lyrics">{multiCurrentTrack}</div>
                )}
            </div>

            <div className="guess-input">
              {!isStarted && isAdmin && (
                <div className="guess-input">
                  <button className="start-button" onClick={handleStart}>
                    Start
                  </button>
                </div>
              )}
              {isStarted && isInitTimerComplete && !isOver && (
                <div className="guess-input">
                  <input
                    type="text"
                    value={guess}
                    onChange={handleGuessChange}
                    onKeyPress={handleKeyPress}
                    disabled={isCorrect}
                  />
                  <button onClick={handleGuessSubmit} disabled={isCorrect}>
                    Guess
                  </button>
                </div>
              )}

              {isOver && (
                <div className="guess-input">
                  <button onClick={onRestart}>Restart</button>
                </div>
              )}
            </div>
          </div>

          <div className="guesses">
            <p className="guess-title">Guesses</p>
            {guesses.length > 0 ? (
              guesses.slice(-5).map((msg, i) => (
                <div
                  className={
                    msg.text === "Correct guess"
                      ? "correct-guess"
                      : "incorrect-guess"
                  }
                >
                  <p>
                    {msg.user}: {msg.text}
                  </p>
                </div>
              ))
            ) : (
              <div className="no-guesses">
                <p>No guesses</p>
              </div>
            )}
          </div>
        </div>
      )}
      ;
    </div>
  );
};

export default Multiplayer;
