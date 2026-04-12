# SÉANCE SEARCH — Desktop Necromancer for the Dead Internet

## Overview
A desktop web application that searches for defunct websites and "summons" their ghosts using AI. Queries the Wayback Machine (Internet Archive) for 404 URLs matching a search query, then uses OpenRouter's AI to generate persona-driven ghost responses.

## Design
- Dark #0a0a0a background with warm sepia tones
- EB Garamond serif font throughout (elegant editorial aesthetic)
- Animated canvas ink brush strokes at top and bottom borders
- GSAP-powered entry animations for title, tagline, and search box
- No user API key required — AI is pre-configured

## Architecture

### Backend (Node.js / Express)
- **`server.js`** — Express web server on port 5000; API routes + static file serving
- **`src/grimoire-web.js`** — SQLite database layer for web version (no Electron dependency)
- **`src/wayback.js`** — Searches Wayback Machine CDX API for 404 URLs; searches until 10+ resources found
- **`src/ai-client.js`** — OpenRouter API client (`z-ai/glm-4.5-air:free` model); API key from `OPENAI_API_KEY` env var

### Frontend (Vanilla JS / HTML / CSS)
- **`src/index.html`** — Multi-view UI: search, loading, results
- **`src/renderer.js`** — Full UI logic with canvas animations, views, modals; works with both Electron IPC and fetch API
- **`src/styles.css`** — Complete new editorial design in dark/sepia palette

### Electron (Desktop .exe)
- **`main.js`** — Electron main process with IPC handlers
- **`preload.js`** — Secure bridge exposing `window.seance.*` to renderer
- **`src/grimoire.js`** — SQLite layer using Electron's `app.getPath('userData')`

## API Endpoints (Web version)
- `POST /api/summon` — `{ query }` → searches Wayback Machine and generates AI ghost responses
- `GET /api/grimoire` — Returns all previously summoned ghosts
- `GET/POST /api/settings` — TTS settings management

## Building the Windows exe
```bash
bash build-exe.sh
```
Output: `dist/SEANCE-SEARCH.exe` (~69MB portable executable)

Note: After building, the script automatically rebuilds the Linux native module so the web server continues working.

## AI Configuration
- Provider: OpenRouter (openrouter.ai)
- Model: `z-ai/glm-4.5-air:free`
- API Key: `OPENAI_API_KEY` environment secret (not exposed to users)

## Running
```
node server.js   # Web preview on port 5000
```

## Dependencies
- `express` — Web server
- `better-sqlite3` — SQLite for grimoire and settings
- `electron` (dev) — Desktop app wrapper
- `electron-builder` (dev) — Windows exe packaging
