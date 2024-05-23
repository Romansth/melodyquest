import React, { useState, useEffect } from "react";
import "./WebPlayback.css";
import CountdownTimer from "../CountdownTimer/CountdownTimer";

const WebPlayback = ({ selectedPlaylist, token, onRestart }) => {
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

  const totalRounds = 5;
  const durationMs = 7000;
  const pauseDurationMs = 5000;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

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

  useEffect(() => {
    if (isGuessingEnd) {
      if (round < totalRounds) {
        setRound(round + 1);
        setGuessingEnd(false);
        setInitTimerComplete(false);
        setRemainingTime(20);
        setIsCorrect(null);
      } else {
        setIsOver(true);
      }
    }
  }, [isGuessingEnd, round, totalRounds]);

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
      console.log("Playback transferred to device:", deviceId);
    } catch (error) {
      console.error("Error transferring playback:", error);
    }
  };

  const playRandomSegmentPlaylist = async (playlistId) => {
    await transferPlaybackHere(token, deviceId);

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch playlist tracks");

      const data = await response.json();
      const tracks = data.items;
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

      setIsCorrect(null);
      setCurrentTrack(randomTrack.track.name);
      if (randomTrack && randomTrack.track) {
        await playTrackSegment(randomTrack.track.uri);
      } else {
        console.error("No tracks found in the playlist");
      }
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    }
  };

  const playTrackSegment = async (trackUri) => {
    await playTrack(trackUri);

    setTimeout(() => {
      player.pause().then(() => {
        setTimeout(() => {
          const startPositionMs =
            30000 + Math.floor(Math.random() * (180000 - 30000));
          player.seek(startPositionMs).then(() => {
            player.resume().then(() => {
              setTimeout(() => {
                setGuessingStart(true);
                player.pause();
              }, durationMs);
            });
          });
        }, pauseDurationMs);
      });
    }, durationMs);
  };

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
    if (correct) {
      setScore((prevScore) => prevScore + remainingTime);
      setTimeout(() => {
        setGuessingEnd(true);
      }, 3000);
    }
    setGuess("");
  };

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

  return (
    <div className="container">
      <div className="main-wrapper">
        <div>
          {!isInitTimerComplete && (
            <CountdownTimer
              seconds={5}
              onTick={handleNothingStartTime}
              onComplete={handleTimerComplete}
            />
          )}
          {isInitTimerComplete && !isOver && (
            <>
              <div className="guess-timer">
                <CountdownTimer
                  seconds={17}
                  onTick={handleRemainingTime}
                  onComplete={handleGuessTimerComplete}
                />
              </div>
              <div className="now-playing__side">
                <div>
                  <input
                    type="text"
                    value={guess}
                    onChange={handleGuessChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your guess"
                  />
                  <button onClick={handleGuessSubmit}>Submit Guess</button>
                </div>
                {isCorrect !== null && (
                  <div
                    className={isCorrect ? "correct-guess" : "incorrect-guess"}
                  >
                    {isCorrect
                      ? "Correct Guess!"
                      : "Incorrect Guess, try again!"}
                  </div>
                )}
                {remainingTime < 3 && (
                  <div id="current-track">{currentTrack}</div>
                )}
              </div>
            </>
          )}
          <div>
            Round: {round}/{totalRounds}
          </div>
          <div>Score: {score}</div>
          {isOver && (
            <div>
              <button onClick={onRestart}>Restart</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebPlayback;
