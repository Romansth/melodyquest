
# MelodyQuest: Guess the Song Challenge

## Overview

**MelodyQuest** is an interactive web-based game where users guess songs based on short audio clips. Utilizing the Spotify Web Playback SDK, the game streams random segments from selected playlists to challenge users' musical knowledge. Currently, MelodyQuest offers an engaging single-player mode, with a multiplayer mode coming soon.

## Getting Started

### Prerequisites

- React.js (v17.0.0)
- Node.js (>=14.x)
- Spotify Premium Account

### Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/Romansth/melodyquest.git
    cd melodyquest
    ```
2. Install dependencies:
    ```sh
    npm install
    ```

3.  Login into Spotify developer dashboard and create a app using the [instructions](https://developer.spotify.com/documentation/web-api/concepts/apps) with permissions for Web API and Web Playback SDK. 

3. Create a `.env` file in the root directory and add your Spotify Client ID and Client secret from your Spotify app.
    ```sh
    SPOTIFY_CLIENT_ID=your_client_id
    SPOTIFY_CLIENT_SECRET=your_client_secret
    ```

### Running the App

1. Start the development server:
    ```sh
    npm run dev
    ```


### Playing the Game

1. Login as guest
2. Select a challenge (playlist) to start.
3. Choose Single player (Multiplayer mode coming soon)
4. Listen to the short audio clip and enter your guess.
5. Your score is updated based on the correctness and the time taken to guess.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes. 

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
