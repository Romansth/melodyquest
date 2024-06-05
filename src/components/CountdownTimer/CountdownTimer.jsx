import React, { useState, useEffect } from "react";

// CountdownTimer component to display and manage a countdown timer
const CountdownTimer = ({ seconds, onTick, onComplete }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(seconds);

  useEffect(() => {
    // Set up a timer to decrease the remaining seconds every second
    const timer = setInterval(() => {
      if (remainingSeconds <= 0) {
        // If time is up, clear the timer and call onComplete callback
        clearInterval(timer);
        onComplete();
      } else {
        setRemainingSeconds((prevSeconds) => prevSeconds - 1);
        onTick(remainingSeconds);  // Call with the next value
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, onTick, onComplete]);

  return <div className="countdown">{remainingSeconds}</div>;
};

export default CountdownTimer;
