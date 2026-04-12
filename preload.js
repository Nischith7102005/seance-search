const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seance', {
  summon: (query) => ipcRenderer.invoke('summon', { query }),
  getGrimoire: () => ipcRenderer.invoke('get-grimoire'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  openWayback: (url) => ipcRenderer.invoke('open-wayback', url)
});
