import React, { useState, useEffect } from "react";

const CountdownTimer = ({ seconds, onTick, onComplete }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(seconds);

  useEffect(() => {
    const timer = setInterval(() => {
      if (remainingSeconds <= 0) {
        clearInterval(timer);
        onComplete();
      } else {
        setRemainingSeconds((prevSeconds) => prevSeconds - 1);
        onTick(remainingSeconds);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, onTick, onComplete]);

  return <div>{remainingSeconds}</div>;
};

export default CountdownTimer;
