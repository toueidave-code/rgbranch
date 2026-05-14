# rgbranch

## Local chat backend

This project now includes a simple open-source room chat backend using Express and Socket.io.

### Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your browser.

### Features

- Shared room chat for all connected clients
- Real-time message broadcasting using Socket.io
- Simple static server for `index.html`, `script.js`, and `style.css`
- Local fallback storage when backend is unavailable
