const request = require("supertest");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const seedDatabase = require("../seedDatabase");
const pool = require("../db");
const { getRandomSongByPlaylistName } = require("../songs");

jest.mock("../songs");
jest.mock("axios");
jest.mock("../db");

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

const socketHandler = require("../socket.js");
const spotifyHandler = require("../spotify.js");

socketHandler(io); // Set up socket.io handlers
spotifyHandler(app); // Set up Spotify-related routes

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

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

app.post("/api/add-score", async (req, res) => {
  try {
    const { name, score } = req.body;

    if (!name || !score) {
      return res.status(400).send("Name and score are required");
    }

    let user = await pool.query("SELECT * FROM scores WHERE name = $1", [name]);

    if (user.rows.length > 0) {
      await pool.query("UPDATE scores SET score = $1 WHERE name = $2", [
        score,
        name,
      ]);
      res.status(200).send("Score updated successfully.");
    } else {
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

describe("Express App", () => {
  let serverInstance;

  beforeAll((done) => {
    serverInstance = server.listen(PORT, () => {
      console.log(`Listening on port ${PORT} for testing`);
      done();
    });
  });

  afterAll((done) => {
    serverInstance.close(done);
  });

  it("should respond to GET / with a message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Server is up and running");
  });

  it("should respond to GET /api/random-song with a song", async () => {
    const song = { id: 1, name: "Test Song" };
    getRandomSongByPlaylistName.mockResolvedValue(song);

    const res = await request(app).get("/api/random-song").query({ playlistName: "Test Playlist" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(song);
  });

  it("should respond to GET /api/random-song with 400 if no playlistName", async () => {
    const res = await request(app).get("/api/random-song");
    expect(res.statusCode).toBe(400);
    expect(res.text).toBe("Playlist name is required");
  });

  it("should respond to GET /api/lyrics with lyrics data", async () => {
    const lyricsData = { message: "Lyrics data" };
    axios.get.mockResolvedValue({ data: lyricsData });

    const res = await request(app).get("/api/lyrics").query({ track: "Test Track", artist: "Test Artist" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(lyricsData);
  });

  it("should respond to POST /api/add-score with status 201 for new user", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({});

    const res = await request(app).post("/api/add-score").send({ name: "Test User", score: 100 });
    expect(res.statusCode).toBe(201);
    expect(res.text).toBe("New user added to the scoreboard.");
  });

  it("should respond to POST /api/add-score with status 200 for existing user", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ name: "Test User", score: 50 }] }).mockResolvedValueOnce({});

    const res = await request(app).post("/api/add-score").send({ name: "Test User", score: 100 });
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Score updated successfully.");
  });

  it("should respond to GET /api/top-scores with top scores", async () => {
    const topScores = [{ name: "User1", score: 100 }, { name: "User2", score: 90 }];
    pool.query.mockResolvedValue({ rows: topScores });

    const res = await request(app).get("/api/top-scores");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(topScores);
  });
});
