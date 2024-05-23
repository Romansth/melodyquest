import React from "react";
import "./SelectChallenge.css";

const SelectChallenge = ({ onPlaylistSelect }) => {
  const playlists = {
    "pop-songs": "2xutOn4Ea4RyjuaRaD3jl3",
    "indie-songs": "37i9dQZF1EQqkOPvHGajmW",
    "rap-songs": "37i9dQZF1EIgbjUtLiWmHt",
    "tiktok-hits": "3i2pjPvqcCKdsedzm1tHGv",
    "movies-shows-musicals": "4hnvhxHyMHrtaylZgMypE1",
    "ed-sheeran": "6M14oz8xWgu8XzDv5OQB5Y",
    "olivia-rodrigo": "6PVHgTRAz4bWZTHxtfxTMI",
    "justin-bieber": "3FxqCKNmp8J6so3EQW4RMt",
    "taylor-swift": "4nWV8MBuTLiyB5NsJH6Wz2",
  };

  const handleSelect = (singerId) => {
    const playlistUri = playlists[singerId];
    onPlaylistSelect(playlistUri);
    const hideSelect = document.getElementById("select-challenge");
  };

  return (
    <div id="select-challenge">
      <h2 className="challenge-title">Select a Challenge</h2>
      <div className="challenge-list">
        <button
          className="challenge"
          id="tiktok-hits"
          onClick={() => handleSelect("tiktok-hits")}
        >
          Tiktok Hits
        </button>
        <button
          className="challenge"
          id="pop-songs"
          onClick={() => handleSelect("pop-songs")}
        >
          Pop Songs
        </button>
        <button
          className="challenge"
          id="indie-songs"
          onClick={() => handleSelect("indie-songs")}
        >
          Indie Songs
        </button>
        <button
          className="challenge"
          id="rap-songs"
          onClick={() => handleSelect("rap-songs")}
        >
          Rap Songs
        </button>
        <button
          className="challenge"
          id="movies-shows-musicals"
          onClick={() => handleSelect("movies-shows-musicals")}
        >
          Movies and Shows
        </button>
        <button
          className="challenge"
          id="ed-shreeran"
          onClick={() => handleSelect("ed-sheeran")}
        >
          Ed Sheeran
        </button>
        <button
          className="challenge"
          id="taylor-swift"
          onClick={() => handleSelect("taylor-swift")}
        >
          Taylor Swift
        </button>
        <button
          className="challenge"
          id="olivia-rodrigo"
          onClick={() => handleSelect("olivia-rodrigo")}
        >
          Olivia Rodrigo
        </button>
        <button
          className="challenge"
          id="justin-bieber"
          onClick={() => handleSelect("justin-bieber")}
        >
          Justin Bieber
        </button>
      </div>
    </div>
  );
};

export default SelectChallenge;
