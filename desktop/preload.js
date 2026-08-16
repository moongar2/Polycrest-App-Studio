const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('polycrestDesktop', {
  platform: process.platform,
  isDesktop: true,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  retryStartup: () => ipcRenderer.invoke('retry-startup')
});
