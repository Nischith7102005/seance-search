const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const { initGrimoire, saveGhost, getGhost, getAllGhosts, saveSettings, getSettings } = require('./src/grimoire');
const { searchWayback } = require('./src/wayback');
const { channelGhost } = require('./src/groq-client');

nativeTheme.themeSource = 'dark';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#00ff41',
      height: 32
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'build', 'icon.ico')
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initGrimoire();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('summon', async (event, { query, apiKey }) => {
  try {
    const deadUrls = await searchWayback(query);

    if (!deadUrls || deadUrls.length === 0) {
      return { error: 'No spirits found in the archive for this query.' };
    }

    const results = [];

    for (const urlData of deadUrls.slice(0, 5)) {
      const priorMemory = getGhost(urlData.url);

      const ghost = await channelGhost({
        query,
        urlData,
        priorMemory,
        apiKey
      });

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

    return { results };
  } catch (err) {
    return { error: err.message || 'The séance failed. The dead are silent.' };
  }
});

ipcMain.handle('get-grimoire', async () => {
  return getAllGhosts();
});

ipcMain.handle('save-settings', async (event, settings) => {
  saveSettings(settings);
  return { ok: true };
});

ipcMain.handle('get-settings', async () => {
  return getSettings();
});

ipcMain.handle('open-wayback', async (event, url) => {
  const waybackUrl = `https://web.archive.org/web/*/${url}`;
  shell.openExternal(waybackUrl);
});
