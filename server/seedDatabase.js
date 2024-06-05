const fetch = require('node-fetch');
const pool = require('./db');
require('dotenv').config();

const token = process.env.SPOTIFY_TOKEN;
const delayInMillis = 1000; // Delay between API requests in milliseconds

const playlists = {
  "pop-songs": "2xutOn4Ea4RyjuaRaD3jl3",
  "indie-songs": "2NJeVNAWQYH4rvFFKMNguu",
  "rap-songs": "5rsl9NqgQnTQn5kUMGKopO",
  "tiktok-hits": "3i2pjPvqcCKdsedzm1tHGv",
  "movies-shows-musicals": "4hnvhxHyMHrtaylZgMypE1",
  "ed-sheeran": "37i9dQZF1DWWxPM4nWdhyI",
  "olivia-rodrigo": "37i9dQZF1DXaohnPXGkLv6",
  "justin-bieber": "37i9dQZF1DXc2aPBXGmXrt",
  "taylor-swift": "37i9dQZF1DX5KpP2LN299J",
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
  for (let playlist in playlists) {
    await fetchAndStoreSongs(playlist, playlists[playlist]);
    await delay(delayInMillis); 
  }
  console.log('Songs have been stored in the database.');
  pool.end(); // Close the database connection
};

module.exports = seedDatabase;
