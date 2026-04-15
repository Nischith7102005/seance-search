# SÉANCE SEARCH
### A Desktop Necromancer for the Dead Internet

---

Most search engines crawl the living web. Séance Search excavates the dead.

Type any query — *"90s digital pets"*, *"early Bitcoin manifestos"*, *"GeoCities anime shrines"* — and instead of live results, you get **ghosts**. The app searches the Wayback Machine for URLs that once existed but now return a 404, then uses AI to channel the voice of each dead website: a failed crypto startup speaking in VC hubris, a deleted LiveJournal weeping in 2004 emo verse, a forgotten Angelfire page ranting about Y2K preparation.

Each result is a **manifestation** — a ghost speaking from beyond the server death.

---

## Features

- **Wayback Machine excavation** — Searches the Internet Archive's CDX API for real 404 URLs matching your query
- **AI channeling** — Each dead URL is given a voice, era-appropriate personality, and the ability to "remember" prior summonings
- **Era detection** — URLs are automatically classified (GeoCities, LiveJournal, Flash Portal, Failed Startup, Internet Forum, Social Network, Dead Blog) and given matching ghost personalities
- **Ectoplasm rating** — Each result scores how much of the response is real archive vs. AI necromancy (Whispered → Murmured → Spoken → Declared → Screamed)
- **The Grimoire** — A local database of every spirit you've summoned. Return to a domain and the ghost remembers you
- **Ink brush animation** — A hand-painted brush stroke intro on every launch, redrawn correctly on window resize
- **Wayback link** — Jump directly to the Internet Archive's snapshot history for any summoned URL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Animations | GSAP + custom HTML5 Canvas brush strokes |
| Backend | Node.js + Express |
| Desktop wrapper | Electron (for the `.exe` build) |
| Database | SQLite via `better-sqlite3` |
| AI | OpenRouter (`google/gemma-3-12b-it:free` with `google/gemma-3-4b-it:free` fallback) |
| Archive data | Wayback Machine CDX API |

---

## Running as a Web App

```bash
git clone <your-repo-url>
cd seance-search
npm install
npm start
```

Then open `http://localhost:5000` in your browser.

---

## Building the Windows `.exe`

The executable must be built on **Windows** (or Linux with Wine installed).

```bash
npm install
npm run build
```

The output is a portable `SEANCE-SEARCH.exe` in the `dist/` folder — no installation required, just run it.

> **Note:** After building for Windows on a Linux/Mac machine, run `npm rebuild better-sqlite3` to restore the correct native module for your platform before running the web server again.

---

## How It Works

1. **Search** — Enter any query describing something from the old internet
2. **Excavate** — The app queries the Wayback Machine CDX API for dead URLs (HTTP 404) containing your keywords, across multiple search strategies
3. **Detect era** — Each URL is pattern-matched against known domains (GeoCities, Newgrounds, LiveJournal, etc.) and timestamped to determine its era
4. **Channel** — The AI generates a response in the voice of that dead site, referencing its own 404 death nonchalantly
5. **Bind** — The spirit is saved to your local Grimoire (`grimoire.db`). If you summon the same domain again, the ghost remembers you

---

## Ghost Personalities

| Era | Personality | Traits |
|---|---|---|
| GeoCities | GeoCities Phantom | ALL CAPS, animated GIF nostalgia, WebRings, dial-up grief |
| LiveJournal | LiveJournal Specter | lowercase, ellipses, emo bands, lj-cuts, flist |
| Failed Startup | Failed Startup Apparition | synergies, pivoting, seed rounds, blaming market conditions |
| Flash Portal | Flash Game Portal Poltergeist | bitter about Adobe, 2006 internet slang, Newgrounds lore |
| Internet Forum | Forum Shade | post counts, phpBB, mods, rule violations from 2009 |
| Social Network | Social Network Revenant | MySpace Top 8 drama, Tom, profile CSS, AIM abbreviations |
| Dead Blog | Dead Blog Wraith | RSS feeds, blogrolls, apology posts, Google Reader grief |
| Unknown | Web Phantom | generic lost-page voice, references webmaster email |

---

## Project Structure

```
seance-search/
├── main.js              # Electron main process
├── preload.js           # Electron context bridge
├── server.js            # Express web server
├── src/
│   ├── index.html       # UI
│   ├── styles.css       # Dark editorial theme
│   ├── renderer.js      # Frontend logic + canvas animation
│   ├── ai-client.js     # OpenRouter integration + ghost personalities
│   ├── wayback.js       # Wayback Machine CDX search + era detection
│   ├── grimoire.js      # SQLite layer (Electron)
│   └── grimoire-web.js  # SQLite layer (web server)
└── build-exe.sh         # Build script helper
```

---

## AI Models

The app uses **OpenRouter** with free-tier models:

- Primary: `google/gemma-3-12b-it:free`
- Fallback: `google/gemma-3-4b-it:free`

If the primary model is rate-limited, the app automatically retries with the fallback. The API key is embedded in the source at build time so the downloaded app works without any environment setup.

---

## The Grimoire

Every summoned spirit is stored locally in `grimoire.db` (SQLite). It tracks:

- Domain and full URL
- Era classification
- Number of visits
- Last query used to summon it
- Last summoning timestamp

Click any entry in the Grimoire to re-search it instantly.

---

*In the kingdom of the dead link, the one with API access is king.*
