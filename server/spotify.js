const request = require("request");
require("dotenv").config();

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
const serverUrl = process.env.SERVER_URL;
const clientUrl = process.env.CLIENT_URL;

const spotify_redirect_uri = `${serverUrl}/auth/callback`;
let storedRefreshToken = null;

// Function to generate a random string of specified length
const generateRandomString = (length) => {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const spotifyHandler = (app) => {
  // Route to initiate Spotify authentication
  app.get("/auth/login", (req, res) => {
    const scope = "streaming user-read-email user-read-private";
    const state = generateRandomString(16);

    const authQueryParameters = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID,
      scope,
      redirect_uri: spotify_redirect_uri,
      state,
    });

    // Redirect to Spotify authorization URL
    res.redirect(`https://accounts.spotify.com/authorize?${authQueryParameters.toString()}`);
  });

  // Callback route to handle the response from Spotify
  app.get("/auth/callback", (req, res) => {
    const code = req.query.code || null;

    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code,
        redirect_uri: spotify_redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      json: true,
    };

    // Exchange authorization code for access and refresh tokens
    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const { access_token, refresh_token } = body;
        storedRefreshToken = refresh_token;

        // Redirect to client application with access token
        res.redirect(`${clientUrl}?access_token=${access_token}`);
      } else {
        res.send("Failed to authenticate");
      }
    });
  });

  // Route to refresh the access token using the refresh token
  app.get("/refresh_token", (req, res) => {
    if (!storedRefreshToken) {
      return res.status(400).send({ error: "No refresh token stored" });
    }

    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      form: {
        grant_type: "refresh_token",
        refresh_token: storedRefreshToken,
      },
      json: true,
    };

    // Request a new access token using the refresh token
    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const { access_token } = body;
        res.send({ access_token });
      } else {
        res
          .status(response.statusCode)
          .send({ error: body.error || "Failed to refresh access token" });
      }
    });
  });
};

module.exports = spotifyHandler;
