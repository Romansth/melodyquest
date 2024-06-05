import React, { useState, useEffect } from "react";

// LyricsFetcher component to display lyrics line by line with a delay
const LyricsFetcher = ({ lyrics }) => {
  const [lines, setLines] = useState([]);
  const [currentLine, setCurrentLine] = useState("");
  const [nextLine, setNextLine] = useState("");

   // Effect to process lyrics prop and split into lines
  useEffect(() => {
    if (lyrics) {
      const allLines = lyrics.split("\n").filter((line) => line.trim() !== "");
      setLines(allLines);
    }
  }, [lyrics]);

  // Effect to update the current and next lines based on processed lines
  useEffect(() => {
    if (lines.length >= 3) {
      setCurrentLine(`${lines[0]}\n${lines[1]}`);
      setNextLine("");
      const timer = setTimeout(() => {
        setNextLine(lines[2]);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [lines]);

  return (
    <div className="lyrics-container">
      {lyrics && (
        <div className="lyrics-content">
          <p className="current-line">{currentLine}</p>
          {nextLine && <p className="next-line">{nextLine}</p>}
        </div>
      )}
    </div>
  );
};

export default LyricsFetcher;
