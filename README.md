# rgbranch

Static web app with Firebase real-time chat integration.

## Setup Firebase

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Realtime Database.
3. Get your Firebase config (API key, project ID, etc.).
4. Replace the placeholder config in `index.html` with your actual config.

## Run locally

Open `index.html` in a browser. No server needed for Firebase integration.

## Chat Features

- Real-time room chat using Firebase Realtime Database.
- Messages persist and sync across all connected users.
- Free tier: 1 GB storage, 100 concurrent connections.
- Fallback to localStorage if Firebase fails.
