const pool = require("./db");

//Fetches a random song from the specified playlist.
const getRandomSongByPlaylistName = async (playlistName) => {
  try {
    // Query to select a random song from the specified playlist
    const result = await pool.query(
      "SELECT * FROM melodyquest WHERE playlist_name = $1 ORDER BY RANDOM() LIMIT 1",
      [playlistName]
    );

    // Return the first (and only) row from the result
    return result.rows[0];
  } catch (error) {
    // Log and rethrow the error for further handling
    console.error(
      `Error fetching random song for playlist ${playlistName}:`,
      error.stack
    );
    throw error;
  }
};

module.exports = {
  getRandomSongByPlaylistName,
};
