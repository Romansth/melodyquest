import React from "react";
import "./ChoosePlayType.css";

const ChoosePlayType = ({ onSinglePlayer, onMultiplayer }) => {
  return (
    <div className="choose-player">
      <h1 className="title">Choose Play Type</h1>
      <button
        className="choosePlayer-button singlePlayer-login"
        onClick={onSinglePlayer}
      >
        SinglePlayer
      </button>
      <button
        className="choosePlayer-button multiplayer-login"
        onClick={onMultiplayer}
      >
        Multiplayer
      </button>
    </div>
  );
};

export default ChoosePlayType;
