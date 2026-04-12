# Séance Search — Necromancer for the Dead Internet

## Overview
A web application that searches for defunct websites and "summons" their ghosts using AI. It queries the Wayback Machine (Internet Archive) for 404 URLs matching a search query, then uses Groq's LLaMA model to generate a persona-driven response mimicking the "ghost" of the dead website.

## Architecture

### Backend (Node.js / Express)
- **`server.js`** — Express web server running on port 5000. Handles API routes and serves static frontend files.
- **`src/grimoire-web.js`** — SQLite database layer (adapted from the original Electron version). Stores summoned ghosts and user settings in `grimoire.db`.
- **`src/wayback.js`** — Queries the Wayback Machine CDX API to find archived 404 URLs.
- **`src/groq-client.js`** — Builds AI prompts and calls the Groq API (llama-3.3-70b-versatile) to generate ghost responses.

### Frontend (Vanilla JS / HTML / CSS)
- **`src/index.html`** — Main UI with dark "grimoire" aesthetic.
- **`src/renderer.js`** — UI logic using `fetch()` to call backend API endpoints.
- **`src/styles.css`** — Custom styling with green-on-black terminal aesthetic, scanlines, animations.

## API Endpoints
- `POST /api/summon` — Takes `{ query, apiKey }`, searches Wayback Machine and generates AI ghost responses
- `GET /api/grimoire` — Returns all previously summoned ghosts from SQLite
- `GET /api/settings` — Returns stored settings (API key, TTS preferences)
- `POST /api/settings` — Saves settings

## Key Notes
- **Groq API Key**: Users must provide their own Groq API key via the Settings modal. Get a free key at console.groq.com.
- **Database**: SQLite file stored at `grimoire.db` in the project root.
- **Original Electron version**: The original `main.js` and `preload.js` files remain for reference but are not used in the web version.

## Running
```
node server.js
```
Server starts on `http://0.0.0.0:5000`

## Dependencies
- `express` — Web server
- `better-sqlite3` — SQLite database for grimoire and settings storage

## Deployment
Configured as a VM deployment (always-running) to maintain SQLite state.
