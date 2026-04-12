const express = require('express');
const path = require('path');
const { initGrimoire, saveGhost, getGhost, getAllGhosts, saveSettings, getSettings } = require('./src/grimoire-web');
const { searchWayback } = require('./src/wayback');
const { channelGhost } = require('./src/ai-client');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

initGrimoire();

app.post('/api/summon', async (req, res) => {
  const { query } = req.body;
  try {
    const deadUrls = await searchWayback(query);

    if (!deadUrls || deadUrls.length === 0) {
      return res.json({ error: 'No spirits found in the archive for this query.' });
    }

    const results = [];

    for (const urlData of deadUrls) {
      const priorMemory = getGhost(urlData.url);

      const ghost = await channelGhost({ query, urlData, priorMemory });

      if (ghost && !ghost.error) {
        saveGhost({
          url: urlData.url,
          domain: urlData.domain,
          era: urlData.era,
          lastSummoned: Date.now(),
          lastQuery: query,
          channeling: ghost.response,
          personality: ghost.personality,
          ectoplasm: ghost.ectoplasm
        });

        results.push({
          url: urlData.url,
          domain: urlData.domain,
          timestamp: urlData.timestamp,
          era: urlData.era,
          response: ghost.response,
          personality: ghost.personality,
          ectoplasm: ghost.ectoplasm,
          confidence: ghost.confidence,
          priorVisits: priorMemory ? priorMemory.visitCount : 0
        });
      }
    }

    return res.json({ results });
  } catch (err) {
    return res.json({ error: err.message || 'The séance failed. The dead are silent.' });
  }
});

app.get('/api/grimoire', (req, res) => {
  res.json(getAllGhosts());
});

app.post('/api/settings', (req, res) => {
  saveSettings(req.body);
  res.json({ ok: true });
});

app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Séance Search running on http://0.0.0.0:${PORT}`);
});
