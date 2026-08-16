const { app, BrowserWindow, Menu, shell, Tray } = require('electron');
const path = require('path');
const { startServer, PORT } = require('./server');

let mainWindow = null;
let serverInstance = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0B0F19',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'PCstarter - PolyCrest Device Bridge & Emulation Station',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  serverInstance = startServer(PORT);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
