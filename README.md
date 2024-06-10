
# MelodyQuest: Guess the Song Challenge

## Overview

**MelodyQuest** is an interactive web-based game where users guess songs based on short audio clips and lyrics. Utilizing the Spotify Web Playback SDK, the game streams random segments from selected playlists to challenge users' musical knowledge. The game offers both single-player and multiplayer modes. In single-player mode, you can listen to a music clip and guess the song name. For multiplayer, you can start or join a room with your friends and guess the song name based on the lyrics.

## Links

Live Website: www.melodyquest.app

DockerHub: [Frontend](https://hub.docker.com/repository/docker/romansth/melodyquest-frontend) [Backend](https://hub.docker.com/repository/docker/romansth/melodyquest-backend)

## Screenshots
 <img src="https://media.discordapp.net/attachments/683899874034319360/1249806221393789008/Screenshot_2024-06-09_at_4.44.07_PM.png?ex=6668a43f&is=666752bf&hm=48aa91909b86b27a31757307a321532fd1e77c4b7617915864ea8081630d0192&=&width=1964&height=1124" height=280><img src ="https://media.discordapp.net/attachments/683899874034319360/1249806158626029598/Screenshot_2024-06-09_at_5.22.39_PM.png?ex=6668a430&is=666752b0&hm=66f3158a147d445f5ebbac0901904ecc127ea97c167836844208709b7291b0a3&=&width=1988&height=1124" height=280>

## Getting Started

### Prerequisites

- React.js (v17.0.0)
- Node.js (>=14.x)
- socket.io
- postgreSQL
- Spotify Premium Account

### Installation

#### Setup postgreSQL database
Create a postgreSQL database and add its configurations to the .env file.

#### Setup Spotify Developer Account
Login into Spotify developer dashboard and create a app using the [instructions](https://developer.spotify.com/documentation/web-api/concepts/apps) with permissions for Web API and Web Playback SDK. 

#### Setup Musixmatch Developer Account
Create a [musixmatch developer account](https://developer.musixmatch.com) and add your api key to .env as ```LYRICS_API_KEY```.

#### Environment Variables
Create a .env file in the root directory and add the following variables

```sh
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_TOKEN=your_spotify_token
DB_USER=your_db_user
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=your_db_port
SERVER_PORT=your_server_port
SERVER_URL=your_server_url
CLIENT_URL=your_client_url
REACT_APP_SERVER_URL=your_react_app_server_url
LYRICS_API_KEY=your_lyrics_api_key
```

Next, you can either follow the traditional method or use Docker for setting up the application.


#### Option 1: Installation using NPM

1. Clone the repository:
    ```sh
    git clone https://github.com/Romansth/melodyquest.git
    cd melodyquest
    ```
2. Install dependencies:
    ```sh
    npm install
    ```

3.  Start the development server
    ```sh
    npm run dev
    ```

#### Option 2: Using Docker 
``` sh
docker compose up
```
    
### Testing
```sh
npm test
```

## Playing the Game

- Open the game in a Chrome browser.
- Select a challenge (playlist) to start.
- Choose Single player or Multiplayer mode.
- In Multiplayer mode, start or join a room to play with your friends.
- Listen to the short audio clip or the lyrics and enter your guess.
- Your score is updated based on the correctness and the time taken to guess.
- Global highscores are stored and displayed on the home page.

## Continuous Integration and Deployment (CI/CD)

The CI/CD pipeline runs unit tests, sends latest merge to Docker Hub, and uses a render hook to deploy the web app on Render.


## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes. 

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
