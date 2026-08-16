const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, exec, execSync } = require('child_process');
const fs = require('fs');
const { startServer: startPCstarter, PORT: PCSTARTER_PORT } = require('./pcstarter/server');

let splashWindow = null;
let mainWindow = null;
let pcstarterWindow = null;
let pcstarterServer = null;
let appEngineProcess = null;
let buildServerProcess = null;
let isQuitting = false;

const PORT_WEB = process.env.PORT || 8888;
const PORT_BUILD = process.env.BUILD_PORT || 9990;

const isPackaged = app.isPackaged;

// Resolve Paths
const ENGINE_DIR = isPackaged
  ? path.join(process.resourcesPath, 'engine')
  : (fs.existsSync(path.join(__dirname, 'engine')) ? path.join(__dirname, 'engine') : path.resolve(__dirname, '..', 'appinventor'));

const WAR_DIR = fs.existsSync(path.join(ENGINE_DIR, 'war'))
  ? path.join(ENGINE_DIR, 'war')
  : path.resolve(__dirname, '..', 'appinventor', 'appengine', 'build', 'war');

const APPENGINE_JAR = fs.existsSync(path.join(ENGINE_DIR, 'appengine-java-sdk', 'lib', 'appengine-tools-api.jar'))
  ? path.join(ENGINE_DIR, 'appengine-java-sdk', 'lib', 'appengine-tools-api.jar')
  : '/opt/homebrew/share/google-cloud-sdk/platform/google_appengine/google/appengine/tools/java/lib/appengine-tools-api.jar';

const BUILD_LIB_DIR = fs.existsSync(path.join(ENGINE_DIR, 'buildserver-lib'))
  ? path.join(ENGINE_DIR, 'buildserver-lib')
  : path.resolve(__dirname, '..', 'appinventor', 'buildserver', 'build', 'run', 'lib');

const DEX_CACHE_DIR = path.join(app.getPath('userData'), 'dexCache');

function checkServerHealth(url, maxRetries = 90, intervalMs = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          clearInterval(interval);
          resolve(true);
        }
      });

      req.on('error', (err) => {
        if (attempts >= maxRetries) {
          clearInterval(interval);
          reject(new Error(`Timed out waiting for server at ${url}`));
        }
      });
      req.end();
    }, intervalMs);
  });
}

function findJavaBinary() {
  // 1. Check JAVA_HOME environment variable
  if (process.env.JAVA_HOME) {
    const candidate = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(candidate)) {
      console.log(`[JavaFinder] Found java via JAVA_HOME: ${candidate}`);
      return candidate;
    }
  }

  // 2. Platform-specific deep search
  if (process.platform === 'win32') {
    // Try where.exe
    try {
      const stdout = execSync('where java', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
      const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (fs.existsSync(line)) {
          console.log(`[JavaFinder] Found java via where.exe: ${line}`);
          return line;
        }
      }
    } catch (e) {}

    const programRoots = [
      process.env['ProgramFiles'] || 'C:\\Program Files',
      process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
      process.env['ProgramW6432'] || 'C:\\Program Files',
      process.env['LOCALAPPDATA'] ? path.join(process.env['LOCALAPPDATA'], 'Programs') : null,
      process.env['USERPROFILE'] ? path.join(process.env['USERPROFILE'], '.jdks') : null,
      process.env['ALLUSERSPROFILE'] ? path.join(process.env['ALLUSERSPROFILE'], 'chocolatey', 'lib') : null
    ].filter(Boolean);

    const vendorDirs = [
      'Eclipse Adoptium',
      'Eclipse Foundation',
      'Semeru',
      'Java',
      'Microsoft',
      'Amazon Corretto',
      'BellSoft',
      'Zulu',
      'OpenLogic',
      path.join('Android', 'Android Studio', 'jbr'),
      path.join('Android', 'Android Studio', 'jre'),
      path.join('Common Files', 'Oracle', 'Java', 'javapath')
    ];

    for (const root of programRoots) {
      if (!fs.existsSync(root)) continue;

      const directExe = path.join(root, 'bin', 'java.exe');
      if (fs.existsSync(directExe)) return directExe;

      for (const vendor of vendorDirs) {
        const vendorPath = path.join(root, vendor);
        if (fs.existsSync(vendorPath)) {
          const directVendorExe = path.join(vendorPath, 'bin', 'java.exe');
          if (fs.existsSync(directVendorExe)) return directVendorExe;

          const directJava = path.join(vendorPath, 'java.exe');
          if (fs.existsSync(directJava)) return directJava;

          try {
            const subdirs = fs.readdirSync(vendorPath);
            for (const sub of subdirs) {
              const subExe = path.join(vendorPath, sub, 'bin', 'java.exe');
              if (fs.existsSync(subExe)) return subExe;
            }
          } catch (e) {}
        }
      }

      // If root itself has subdirectories (like .jdks)
      try {
        const subdirs = fs.readdirSync(root);
        for (const sub of subdirs) {
          const subExe = path.join(root, sub, 'bin', 'java.exe');
          if (fs.existsSync(subExe)) return subExe;
        }
      } catch (e) {}
    }
  } else if (process.platform === 'darwin') {
    const macCandidates = [
      '/opt/homebrew/opt/openjdk@17/bin/java',
      '/opt/homebrew/opt/openjdk/bin/java',
      '/usr/local/opt/openjdk@17/bin/java',
      '/usr/local/opt/openjdk/bin/java',
      '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/java',
      '/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home/bin/java'
    ];
    for (const c of macCandidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return process.platform === 'win32' ? 'java.exe' : 'java';
}

function verifyJavaInstalled(javaBin) {
  return new Promise((resolve) => {
    try {
      const child = spawn(javaBin, ['-version'], { stdio: 'ignore', shell: false });
      child.on('error', (err) => {
        console.warn(`[JavaVerifier] Could not run "${javaBin}":`, err.message);
        resolve(false);
      });
      child.on('close', (code) => {
        console.log(`[JavaVerifier] "${javaBin}" returned code ${code}`);
        resolve(code === 0 || code === 1);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

function startBuildServer(javaBin) {
  if (!fs.existsSync(DEX_CACHE_DIR)) {
    try {
      fs.mkdirSync(DEX_CACHE_DIR, { recursive: true });
    } catch (e) {}
  }

  if (!fs.existsSync(BUILD_LIB_DIR)) {
    console.warn(`[BuildServer] Library directory not found at ${BUILD_LIB_DIR}, skipping local buildserver spawn.`);
    return;
  }

  console.log(`[Desktop] Starting BuildServer using "${javaBin}" on port ${PORT_BUILD}...`);
  try {
    const cpPattern = process.platform === 'win32' ? '*;.' : '*';
    buildServerProcess = spawn(
      javaBin,
      [
        '-Dfile.encoding=UTF-8',
        '-Dkeystore.pkcs12.legacy=true',
        '-Djava.awt.headless=true',
        '-cp',
        cpPattern,
        'com.google.appinventor.buildserver.BuildServer',
        '--dexCacheDir',
        DEX_CACHE_DIR,
        '--shutdownToken',
        'token'
      ],
      {
        cwd: BUILD_LIB_DIR,
        stdio: 'pipe',
        detached: false,
        shell: false
      }
    );

    buildServerProcess.on('error', (err) => {
      console.warn(`[BuildServer] Warning: Could not spawn BuildServer: ${err.message}`);
    });

    buildServerProcess.stdout.on('data', (d) => console.log(`[BuildServer] ${d}`));
    buildServerProcess.stderr.on('data', (d) => console.error(`[BuildServer ERR] ${d}`));
  } catch (err) {
    console.warn(`[BuildServer] Exception starting buildserver: ${err.message}`);
  }
}

function startAppEngineDevServer(javaBin) {
  console.log(`[Desktop] Starting AppEngine Web Server with Java at "${javaBin}" on port ${PORT_WEB}...`);
  
  const args = [
    '-ea',
    '--add-opens=java.base/java.net=ALL-UNNAMED',
    '--add-opens=java.base/sun.net.www.protocol.http=ALL-UNNAMED',
    '--add-opens=java.base/sun.net.www.protocol.https=ALL-UNNAMED',
    '-Dfile.encoding=UTF-8',
    '-cp',
    APPENGINE_JAR,
    'com.google.appengine.tools.KickStart',
    'com.google.appengine.tools.development.DevAppServerMain',
    '--promote_yaml',
    '--port=' + PORT_WEB,
    '--address=127.0.0.1',
    WAR_DIR
  ];

  if (process.platform === 'darwin') {
    args.unshift('-XstartOnFirstThread');
  }

  try {
    appEngineProcess = spawn(javaBin, args, {
      cwd: WAR_DIR,
      stdio: 'pipe',
      detached: false,
      shell: false
    });

    appEngineProcess.on('error', (err) => {
      console.warn(`[DevServer] Warning: Could not spawn AppEngine server: ${err.message}`);
    });

    appEngineProcess.stdout.on('data', (d) => console.log(`[DevServer] ${d}`));
    appEngineProcess.stderr.on('data', (d) => console.error(`[DevServer ERR] ${d}`));
  } catch (err) {
    console.warn(`[DevServer] Exception starting devserver: ${err.message}`);
  }
}

async function bootLocalStudioEngine() {
  const isRunning = await checkServerHealth(`http://127.0.0.1:${PORT_WEB}/`, 2, 300).catch(() => false);
  if (isRunning) return true;

  const javaBin = findJavaBinary();
  const hasJava = await verifyJavaInstalled(javaBin);
  if (!hasJava) return false;

  console.log(`[Desktop] Booting Studio engine using ${javaBin}...`);
  startBuildServer(javaBin);
  startAppEngineDevServer(javaBin);

  return await checkServerHealth(`http://127.0.0.1:${PORT_WEB}/`, 30, 1000).catch(() => false);
}

ipcMain.handle('retry-startup', async () => {
  return await bootLocalStudioEngine();
});

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 380,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash', 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
}

const DEFAULT_CLOUD_STUDIO = process.env.STUDIO_URL || 'https://polycrest-app-studio.web.app/?locale=en';
let activeStudioUrl = DEFAULT_CLOUD_STUDIO;

function createMainWindow(studioUrl = activeStudioUrl) {
  activeStudioUrl = studioUrl;

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#121316',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'PolyCrest App Studio',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    }
  });

  setupAppMenu();

  console.log(`[Desktop] Loading App Studio UI from: ${activeStudioUrl}`);
  if (activeStudioUrl.startsWith('http://') || activeStudioUrl.startsWith('https://')) {
    mainWindow.loadURL(activeStudioUrl);
  } else {
    mainWindow.loadFile(activeStudioUrl);
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Desktop] Page failed to load: ${validatedURL} (code: ${errorCode}, desc: ${errorDescription})`);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Browser Console] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createPCstarterWindow() {
  if (pcstarterWindow && !pcstarterWindow.isDestroyed()) {
    pcstarterWindow.focus();
    return;
  }

  pcstarterWindow = new BrowserWindow({
    width: 1140,
    height: 780,
    minWidth: 920,
    minHeight: 600,
    backgroundColor: '#0B0F19',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'PCstarter - PolyCrest Device Bridge & Emulation Station',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  pcstarterWindow.loadURL(`http://127.0.0.1:${PCSTARTER_PORT}/`);

  pcstarterWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  pcstarterWindow.on('closed', () => {
    pcstarterWindow = null;
  });
}

function setupAppMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: 'PolyCrest App Studio',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project...',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) mainWindow.webContents.executeJavaScript('BlocklyPanel_startNewProject() || true');
          }
        },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'PCstarter Device Bridge & Emulation Hub...',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            createPCstarterWindow();
          }
        },
        {
          label: 'Launch PolyCrest Companion on USB Device',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => {
            http.get(`http://127.0.0.1:${PCSTARTER_PORT}/replstart/`, () => {}).on('error', () => {});
          }
        },
        { type: 'separator' },
        {
          label: 'Restart ADB Service',
          click: () => {
            http.get(`http://127.0.0.1:${PCSTARTER_PORT}/reset/`, () => {}).on('error', () => {});
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'PolyCrest Academy Documentation',
          click: async () => {
            await shell.openExternal('https://polycrest.ac');
          }
        },
        {
          label: 'About PolyCrest App Studio',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'PolyCrest App Studio',
              message: 'PolyCrest App Studio v1.0.0',
              detail: 'Next-Generation Visual Game & Application Studio Engine.\nPremier Game Development & Design School in Africa.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function cleanupProcesses() {
  if (isQuitting) return;
  isQuitting = true;
  console.log('[Desktop] Cleaning up backend services...');

  if (pcstarterServer) {
    try {
      pcstarterServer.close();
    } catch (e) {}
  }

  if (appEngineProcess) {
    try {
      appEngineProcess.kill('SIGTERM');
    } catch (e) {}
  }

  if (buildServerProcess) {
    try {
      buildServerProcess.kill('SIGTERM');
    } catch (e) {}
  }
}

app.whenReady().then(async () => {
  createSplashWindow();

  // 1. Start PCstarter Bridge Daemon on port 8004 (native Node.js / ADB - zero Java requirements)
  try {
    pcstarterServer = startPCstarter(PCSTARTER_PORT);
  } catch (e) {
    console.warn('[Desktop] PCstarter daemon notice:', e.message);
  }

  let finalUrl = `http://127.0.0.1:${PORT_WEB}/index.jsp?locale=en`;

  // 2. Check if local server is already running on port 8888
  const isLocalRunning = await checkServerHealth(`http://127.0.0.1:${PORT_WEB}/index.jsp?locale=en`, 3, 300).catch(() => false);
  
  if (isLocalRunning) {
    console.log(`[Desktop] Found active local studio server on port ${PORT_WEB}`);
    createMainWindow(`http://127.0.0.1:${PORT_WEB}/index.jsp?locale=en`);
  } else {
    // 3. Try starting local Java backend
    const javaBin = findJavaBinary();
    const hasJava = await verifyJavaInstalled(javaBin);
    const hasWarDir = fs.existsSync(WAR_DIR);

    if (hasJava && hasWarDir) {
      console.log(`[Desktop] Launching local backend engine with Java at: ${javaBin}`);
      startBuildServer(javaBin);
      startAppEngineDevServer(javaBin);

      const localStarted = await checkServerHealth(`http://127.0.0.1:${PORT_WEB}/index.jsp?locale=en`, 50, 500).catch(() => false);
      if (localStarted) {
        createMainWindow(`http://127.0.0.1:${PORT_WEB}/index.jsp?locale=en`);
        return;
      }
    }

    // 4. If local server not running, show in-app setup & launcher screen
    console.log(`[Desktop] Local server not active; displaying setup & launcher window`);
    createMainWindow(path.join(__dirname, 'offline.html'));
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', cleanupProcesses);
app.on('will-quit', cleanupProcesses);
app.on('window-all-closed', () => {
  cleanupProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

