const express = require('express');
const request = require('request');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = 5030;

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const spotify_redirect_uri = 'http://localhost:5030/auth/callback';

let storedRefreshToken = null;

app.use(cors());

const generateRandomString = function(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

app.get('/auth/login', (req, res) => {
    const scope = 'streaming user-read-email user-read-private';
    const state = generateRandomString(16);

    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: spotify_client_id,
        scope: scope,
        redirect_uri: spotify_redirect_uri,
        state: state,
    });

    res.redirect('https://accounts.spotify.com/authorize?' + auth_query_parameters.toString());
});

app.get('/auth/callback', (req, res) => {
    const code = req.query.code || null;

    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: spotify_redirect_uri,
            grant_type: 'authorization_code',
        },
        headers: {
            'Authorization': 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        json: true,
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            const access_token = body.access_token;
            const refresh_token = body.refresh_token;

            storedRefreshToken = refresh_token; // Store refresh token securely

            res.redirect(`http://localhost:3050?access_token=${access_token}`);
        } else {
            res.send('Failed to authenticate');
        }
    });
});

app.get('/refresh_token', (req, res) => {
    if (!storedRefreshToken) {
        return res.status(400).send({ error: 'No refresh token stored' });
    }

    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: storedRefreshToken,
        },
        json: true,
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            const access_token = body.access_token;
            res.send({ access_token: access_token });
        } else {
            res.status(response.statusCode).send({ error: body.error || 'Failed to refresh access token' });
        }
    });
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});
