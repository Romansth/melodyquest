const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const seedDatabase = require("./seedDatabase");
const pool = require("./db");
const { getRandomSongByPlaylistName } = require("./songs");

// Load environment variables from .env file
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"], 
  },
});

const PORT = process.env.SERVER_PORT || 8004;

app.use(cors());
app.use(express.json()); 

// One-time database seeding
// seedDatabase()
//   .then(() => {
//     console.log('Database seeding complete.');
//   })
//   .catch((err) => {
//     console.error('Error seeding the database:', err);
//   });

const socketHandler = require("./socket.js");
const spotifyHandler = require("./spotify.js");

socketHandler(io); // Set up socket.io handlers
spotifyHandler(app); // Set up Spotify-related routes

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

// Route to get a random song from a playlist
app.get("/api/random-song", async (req, res) => {
  try {
    const { playlistName } = req.query;
    if (!playlistName) {
      return res.status(400).send("Playlist name is required");
    }
    const song = await getRandomSongByPlaylistName(playlistName);
    if (!song) {
      return res.status(404).send("No songs found for the given playlist");
    }
    res.json(song);
  } catch (error) {
    console.error("Error fetching random song:", error);
    res.status(500).send("An error occurred while fetching the song");
  }
});

// Route to get lyrics for a specific track and artist
app.get("/api/lyrics", async (req, res) => {
  try {
    const { track, artist } = req.query;
    const response = await axios.get(
      "https://api.musixmatch.com/ws/1.1/matcher.lyrics.get",
      {
        params: {
          q_track: track,
          q_artist: artist,
          apikey: process.env.LYRICS_API_KEY,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    res.status(500).send("An error occurred while fetching lyrics");
  }
});

// Route to add or update a user's score
app.post("/api/add-score", async (req, res) => {
  try {
    const { name, score } = req.body;

    if (!name || !score) {
      return res.status(400).send("Name and score are required");
    }

    let user = await pool.query("SELECT * FROM scores WHERE name = $1", [name]);

    if (user.rows.length > 0) {
      // Update score if user already exists
      await pool.query("UPDATE scores SET score = $1 WHERE name = $2", [
        score,
        name,
      ]);
      res.status(200).send("Score updated successfully.");
    } else {
      // Insert new user and score
      await pool.query("INSERT INTO scores (name, score) VALUES ($1, $2)", [
        name,
        score,
      ]);
      res.status(201).send("New user added to the scoreboard.");
    }
  } catch (error) {
    console.error("Error adding/updating score:", error);
    res.status(500).send("Server error");
  }
});

// Route to get top 10 scores
app.get("/api/top-scores", async (req, res) => {
  try {
    const topScores = await pool.query(
      "SELECT * FROM scores ORDER BY score DESC LIMIT 10"
    );
    res.json(topScores.rows);
  } catch (error) {
    console.error("Error fetching top scores:", error);
    res.status(500).send("Server error");
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
