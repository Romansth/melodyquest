const fetch = require('node-fetch');
const pool = require('./db');
require('dotenv').config();

const token = process.env.SPOTIFY_TOKEN;
const delayInMillis = 1000; // Delay between API requests in milliseconds

const playlists = {
  "pop-songs": "5nYj43JXdyVx0yAtY5OVFP",
  "indie-songs": "30QV4edB1roGt1FnTNxqy1",
  "rap-songs": "5rsl9NqgQnTQn5kUMGKopO",
  "rock-songs": "7DgPQwzEoUVfQYBiMLER9Z",
  "movies-shows-musicals": "4hnvhxHyMHrtaylZgMypE1",
  "ed-sheeran": "37i9dQZF1DWWxPM4nWdhyI",
  "olivia-rodrigo": "37i9dQZF1DXaohnPXGkLv6",
  "one-direction": "6vHhQOHGABPPMcLumvTBpN",
  "taylor-swift": "37i9dQZF1DX5KpP2LN299J",
};

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS melodyquest (
      id SERIAL PRIMARY KEY,
      playlist_name VARCHAR(255) NOT NULL,
      playlist_uri VARCHAR(255) NOT NULL,
      primary_artist VARCHAR(255) NOT NULL,
      track_name VARCHAR(255) NOT NULL,
      track_uri VARCHAR(255) NOT NULL
    );
  `;
  try {
    await pool.query(query);
    console.log('Table melodyquest is ready.');
  } catch (error) {
    console.error('Error creating melodyquest table:', error);
  }
};

const createScoresTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      score INTEGER NOT NULL
    );
  `;
  try {
    await pool.query(query);
    console.log('Table scores is ready.');
  } catch (error) {
    console.error('Error creating scores table:', error);
  }
};

//Fetches tracks from a Spotify playlist and stores them in the database.
const fetchAndStoreSongs = async (playlist_name, playlistId) => {
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
    const tracks = await response.json();
    const trackList = tracks.items;

    for (const track of trackList) {
      const playlist_uri = playlistId;
      const primary_artist = track.track.artists[0].name;
      const track_name = track.track.name;
      const track_uri = track.track.uri;

      await pool.query(
        'INSERT INTO melodyquest (playlist_name, playlist_uri, primary_artist, track_name, track_uri) VALUES ($1, $2, $3, $4, $5)',
        [playlist_name, playlist_uri, primary_artist, track_name, track_uri]
      );
    }
  } catch (error) {
    console.error(`Error fetching or storing songs for playlist ${playlist_name}:`, error);
  }
};

//Delays execution for a specified amount of time.
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//Seeds the database with songs from the specified playlists.
const seedDatabase = async () => {
  await createTable();
  await createScoresTable(); 
  for (let playlist in playlists) {
    await fetchAndStoreSongs(playlist, playlists[playlist]);
    await delay(delayInMillis); 
  }
  console.log('Songs have been stored in the database.');
  pool.end(); // Close the database connection
};

module.exports = seedDatabase;
