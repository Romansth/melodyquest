const { addUser, getUser, deleteUser, getUsers } = require("./users.js");
const axios = require("axios");
require("dotenv").config();

const socketHandler = (io) => {
  let usersScores = [];
  let roomAdmins = {};

  // Function to assign a new admin to a room
  const assignAdmin = (room) => {
    const usersInRoom = getUsers(room);
    if (usersInRoom.length > 0) {
      roomAdmins[room] = usersInRoom[0].id;
    } else {
      delete roomAdmins[room];
    }
  };

  // Event listener for a new socket connection
  io.on("connection", (socket) => {
    console.log("New connection:", socket.id);

    // Event listener for user login
    socket.on("login", ({ name, room }, callback) => {
      console.log("Login attempt:", name, room);
      const { user, error } = addUser(socket.id, name, room);
      if (error) {
        console.error("Login error:", error);
        return callback(error);
      }

      socket.join(user.room);
      usersScores.push({ name, score: 0, room });

      if (!roomAdmins[room]) {
        roomAdmins[room] = socket.id;
      }

      io.to(room).emit(
        "users",
        usersScores.filter((user) => user.room === room)
      );
      console.log(`User ${user.name} joined room ${user.room}`);
      socket.to(room).emit("notification", {
        title: "Someone's here",
        description: `${user.name} just entered the room`,
      });
      io.to(room).emit("users", getUsers(room));
      callback();
    });

    // Event listener for sending a message
    socket.on("sendMessage", (message, callback) => {
      const user = getUser(socket.id);
      if (user) {
        const messageData = { user: user.name, text: message.message };
        io.in(user.room).emit("message", messageData);
      }
      callback();
    });

    // Event listener for sending a guess
    socket.on("sendGuess", (guess, callback) => {
      const user = getUser(socket.id);
      if (user) {
        const guessData = { user: user.name, text: guess };
        io.in(user.room).emit("guesses", guessData);
      }
      callback();
    });

    // Event listener to start lyrics fetching
    socket.on("startLyrics", async ({ track, artist, room }) => {
      if (socket.id !== roomAdmins[room]) {
        return;
      }

      try {
        const serverUrl = process.env.SERVER_URL;
        const response = await axios.get(`${serverUrl}/api/lyrics`, {
          params: { track, artist },
        });
        const lyricsData = response.data.message.body.lyrics;
        const lyrics = lyricsData ? lyricsData.lyrics_body : "Lyrics not found";

        io.to(room).emit("lyrics", lyrics);
        io.to(room).emit("track", { track, artist });
        io.to(room).emit("roomStartStatus", "true");
      } catch (err) {
        io.to(room).emit(
          "lyrics",
          "An error occurred while fetching the lyrics."
        );
      }
    });

    // Event listener for a correct guess
    socket.on("correctGuess", ({ name, room, remainingTime }) => {
      const userIndex = usersScores.findIndex(
        (user) => user.name === name && user.room === room
      );
      if (userIndex !== -1) {
        usersScores[userIndex].score += remainingTime;
        io.to(room).emit(
          "scores",
          usersScores.filter((user) => user.room === room)
        );
      }
    });

    // Event listeners for various timer statuses
    socket.on("sendInitTimerStatus", ({ status, room }) => {
      io.to(room).emit("InitTimerStatus", status);
    });

    socket.on("sendGuessTimerStatus", ({ guessstatus, room }) => {
      io.to(room).emit("GuessTimerStatus", guessstatus);
    });

    socket.on("sendOverStatus", ({ overstatus, room }) => {
      io.to(room).emit("OverStatus", overstatus);
    });

    // WebRTC event listeners
    socket.on("offer", (data) => {
      socket.broadcast.emit("offer", data);
    });

    socket.on("answer", (data) => {
      socket.broadcast.emit("answer", data);
    });

    // Event listener for user disconnection
    socket.on("disconnect", () => {
      const user = deleteUser(socket.id);
      if (user) {
        io.to(user.room).emit("notification", {
          title: "Someone just left",
          description: `${user.name} just left the room`,
        });
        io.to(user.room).emit("users", getUsers(user.room));
        io.to(user.room).emit(
          "scores",
          usersScores.filter(
            (userz) => userz.room === user.room && userz.name !== user.name
          )
        );
        console.log(`User ${user.name} disconnected from room ${user.room}`);

        if (socket.id === roomAdmins[user.room]) {
          assignAdmin(user.room);
        }
      }
    });
  });
};

module.exports = socketHandler;
