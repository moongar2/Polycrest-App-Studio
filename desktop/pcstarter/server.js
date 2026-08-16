/**
 * PCstarter - Next-Generation Device Bridge, Emulation Station & USB Debugger
 * HTTP Daemon on Port 8004 (PolyCrest App Studio Bridge) + Extended REST API
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

const PORT = process.env.PCSTARTER_PORT || 8004;
const COMPANION_APK = path.resolve(__dirname, '..', '..', 'appinventor', 'build', 'buildserver', 'PolyCrest Companion.apk');

// Find ADB Path
function getAdbPath() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const userHome = process.env.USERPROFILE || process.env.HOME || '';

  const commonPaths = [
    // Windows paths
    path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    path.join(userHome, 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    'C:\\Program Files (x86)\\Android\\android-sdk\\platform-tools\\adb.exe',
    'C:\\Android\\sdk\\platform-tools\\adb.exe',
    // macOS / Linux paths
    '/opt/homebrew/share/android-commandlinetools/platform-tools/adb',
    '/opt/homebrew/bin/adb',
    '/usr/local/bin/adb',
    path.join(userHome, 'Library', 'Android', 'sdk', 'platform-tools', 'adb'),
    process.platform === 'win32' ? 'adb.exe' : 'adb'
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return process.platform === 'win32' ? 'adb.exe' : 'adb';
}

function getEmulatorPath() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const userHome = process.env.USERPROFILE || process.env.HOME || '';

  const commonPaths = [
    // Windows paths
    path.join(localAppData, 'Android', 'Sdk', 'emulator', 'emulator.exe'),
    path.join(userHome, 'AppData', 'Local', 'Android', 'Sdk', 'emulator', 'emulator.exe'),
    'C:\\Program Files (x86)\\Android\\android-sdk\\emulator\\emulator.exe',
    'C:\\Android\\sdk\\emulator\\emulator.exe',
    // macOS / Linux paths
    '/opt/homebrew/share/android-commandlinetools/emulator/emulator',
    path.join(userHome, 'Library', 'Android', 'sdk', 'emulator', 'emulator'),
    '/opt/homebrew/bin/emulator',
    '/usr/local/bin/emulator',
    process.platform === 'win32' ? 'emulator.exe' : 'emulator'
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return process.platform === 'win32' ? 'emulator.exe' : 'emulator';
}

const ADB_BIN = getAdbPath();

// Execute command helper
function execCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { env: process.env, ...options }, (err, stdout, stderr) => {
      if (err) {
        resolve({ error: err, stdout: stdout || '', stderr: stderr || '' });
      } else {
        resolve({ stdout: stdout || '', stderr: stderr || '' });
      }
    });
  });
}

// Get connected devices list
async function getConnectedDevices() {
  const res = await execCommand(`"${ADB_BIN}" devices -l`);
  const lines = res.stdout.split('\n');
  const devices = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const serial = parts[0];
      const state = parts[1];
      const isEmulator = serial.startsWith('emulator-');
      
      let model = 'Android Device';
      let product = '';
      let usb = '';
      for (const p of parts) {
        if (p.startsWith('model:')) model = p.replace('model:', '').replace(/_/g, ' ');
        if (p.startsWith('product:')) product = p.replace('product:', '');
        if (p.startsWith('usb:')) usb = p.replace('usb:', '');
      }

      devices.push({
        serial,
        state,
        isEmulator,
        model,
        product,
        usb,
        isWireless: serial.includes(':')
      });
    }
  }

  return devices;
}

// Get enriched device details
async function getDeviceDetails(serial) {
  const [modelRes, sdkRes, relRes, batteryRes, sizeRes, ipRes] = await Promise.all([
    execCommand(`"${ADB_BIN}" -s ${serial} shell getprop ro.product.model`),
    execCommand(`"${ADB_BIN}" -s ${serial} shell getprop ro.build.version.sdk`),
    execCommand(`"${ADB_BIN}" -s ${serial} shell getprop ro.build.version.release`),
    execCommand(`"${ADB_BIN}" -s ${serial} shell dumpsys battery`),
    execCommand(`"${ADB_BIN}" -s ${serial} shell wm size`),
    execCommand(`"${ADB_BIN}" -s ${serial} shell ip -f inet addr show wlan0`)
  ]);

  let batteryLevel = '100%';
  if (batteryRes.stdout) {
    const match = batteryRes.stdout.match(/level:\s*(\d+)/i);
    if (match) batteryLevel = match[1] + '%';
  }

  let resolution = '1080x2400';
  if (sizeRes.stdout) {
    const match = sizeRes.stdout.match(/Physical size:\s*(\d+x\d+)/i);
    if (match) resolution = match[1];
  }

  let ip = 'Unknown';
  if (ipRes.stdout) {
    const match = ipRes.stdout.match(/inet\s+([0-9.]+)/i);
    if (match) ip = match[1];
  }

  return {
    serial,
    model: modelRes.stdout.trim() || 'Android Device',
    sdk: sdkRes.stdout.trim() || '34',
    androidVersion: relRes.stdout.trim() || '14',
    battery: batteryLevel,
    resolution,
    ip,
    isEmulator: serial.startsWith('emulator-'),
    isWireless: serial.includes(':')
  };
}

// Available AVD list
async function getAvailableAVDs() {
  const res = await execCommand('emulator -list-avds 2>/dev/null || avdmanager list avd -c 2>/dev/null');
  if (res.stdout) {
    return res.stdout.split('\n').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// HTTP Server
function createServer() {
  const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1:8004'}`);
    const pathname = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    try {
      // 1. App Inventor / PolyCrest Studio Compatibility Endpoints
      if (pathname === '/ping/' || pathname === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'PCstarter', version: '2.4' }));
        return;
      }

      if (pathname === '/ucheck/' || pathname === '/ucheck') {
        // Check for USB Device
        const devices = await getConnectedDevices();
        const usbDev = devices.find(d => !d.isEmulator && d.state === 'device');
        if (usbDev) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'OK', version: '2.4', device: usbDev.serial }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'NO', version: '2.4', device: 'none' }));
        }
        return;
      }

      if (pathname === '/echeck/' || pathname === '/echeck') {
        // Check for Running Emulator
        const devices = await getConnectedDevices();
        const emuDev = devices.find(d => d.isEmulator && d.state === 'device');
        if (emuDev) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'OK', version: '2.4', device: emuDev.serial }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'NO', version: '2.4', device: 'none' }));
        }
        return;
      }

      if (pathname.startsWith('/replstart/')) {
        let deviceId = pathname.replace('/replstart/', '').trim();
        if (deviceId === 'undefined' || deviceId === 'null') deviceId = '';
        console.log(`[PCstarter] Starting companion bridge for device: ${deviceId || 'default'}`);
        
        // Forward tcp:8001 -> tcp:8001
        await execCommand(`"${ADB_BIN}" ${deviceId ? `-s ${deviceId}` : ''} forward tcp:8001 tcp:8001`);
        
        // Launch Companion App
        await execCommand(`"${ADB_BIN}" ${deviceId ? `-s ${deviceId}` : ''} shell am start -n edu.mit.appinventor.aicompanion3/.Screen1`);
        
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK\n');
        return;
      }

      if (pathname === '/start/' || pathname === '/start') {
        console.log('[PCstarter] /start/ requested. Launching emulator instance...');
        const avds = await getAvailableAVDs();
        const emuPath = getEmulatorPath();
        if (avds.length > 0 && emuPath) {
          spawn(emuPath, [
            '-avd', avds[0],
            '-gpu', 'host',
            '-no-boot-anim',
            '-no-audio',
            '-netdelay', 'none',
            '-netspeed', 'full',
            '-accel', 'on'
          ], {
            detached: true,
            stdio: 'ignore'
          }).unref();
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK\n');
        return;
      }

      if (pathname === '/reset/' || pathname === '/reset') {
        console.log('[PCstarter] Restarting ADB server...');
        await execCommand(`"${ADB_BIN}" kill-server`);
        await execCommand(`"${ADB_BIN}" start-server`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK\n');
        return;
      }

      if (pathname === '/emulatorreset/' || pathname === '/emulatorreset') {
        console.log('[PCstarter] Resetting emulator connections...');
        await execCommand(`"${ADB_BIN}" kill-server`);
        await execCommand(`"${ADB_BIN}" start-server`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK\n');
        return;
      }

      if (pathname === '/package/' || pathname === '/package') {
        const devices = await getConnectedDevices();
        if (devices.length > 0 && fs.existsSync(COMPANION_APK)) {
          await execCommand(`"${ADB_BIN}" -s ${devices[0].serial} install -r -d "${COMPANION_APK}"`);
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK\n');
        return;
      }

      // 2. PCstarter Extended REST API for Dashboard UI
      if (pathname === '/api/devices') {
        const rawDevices = await getConnectedDevices();
        const details = await Promise.all(rawDevices.map(d => getDeviceDetails(d.serial)));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, devices: details }));
        return;
      }

      if (pathname === '/api/avds') {
        const avds = await getAvailableAVDs();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, avds }));
        return;
      }

      if (pathname === '/api/launch-avd' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
          const data = JSON.parse(body || '{}');
          const avds = await getAvailableAVDs();
          const avdName = data.avdName || avds[0];
          const emuPath = getEmulatorPath();
          if (avdName && emuPath) {
            spawn(emuPath, [
              '-avd', avdName,
              '-gpu', 'host',
              '-no-boot-anim',
              '-no-audio',
              '-netdelay', 'none',
              '-netspeed', 'full',
              '-accel', 'on'
            ], {
              detached: true,
              stdio: 'ignore'
            }).unref();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Booting emulator: ${avdName}` }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'No AVD or emulator available.' }));
          }
        });
        return;
      }

      if (pathname === '/api/forward' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
          const data = JSON.parse(body || '{}');
          const serial = data.serial || '';
          const localPort = data.localPort || '8001';
          const remotePort = data.remotePort || '8001';
          
          await execCommand(`"${ADB_BIN}" ${serial ? `-s ${serial}` : ''} forward tcp:${localPort} tcp:${remotePort}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Port forward tcp:${localPort} -> tcp:${remotePort} established.` }));
        });
        return;
      }

      if (pathname === '/api/launch-companion' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
          const data = JSON.parse(body || '{}');
          const serial = data.serial || '';
          
          await execCommand(`"${ADB_BIN}" ${serial ? `-s ${serial}` : ''} forward tcp:8001 tcp:8001`);
          await execCommand(`"${ADB_BIN}" ${serial ? `-s ${serial}` : ''} shell am start -n edu.mit.appinventor.aicompanion3/.Screen1`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'PolyCrest Companion launched on device.' }));
        });
        return;
      }

      if (pathname === '/api/install-companion' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
          const data = JSON.parse(body || '{}');
          const serial = data.serial || '';
          
          if (!fs.existsSync(COMPANION_APK)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Companion APK binary not found.' }));
            return;
          }

          const installRes = await execCommand(`"${ADB_BIN}" ${serial ? `-s ${serial}` : ''} install -r -d "${COMPANION_APK}"`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: !installRes.error, output: installRes.stdout || installRes.stderr }));
        });
        return;
      }

      if (pathname === '/api/screenshot') {
        const serial = query.serial || '';
        const screencap = spawn(ADB_BIN, [...(serial ? ['-s', serial] : []), 'exec-out', 'screencap', '-p']);
        
        res.writeHead(200, { 'Content-Type': 'image/png' });
        screencap.stdout.pipe(res);
        screencap.stderr.on('data', (d) => console.error(`[Screencap Err] ${d}`));
        return;
      }

      if (pathname === '/api/logcat/stream') {
        // Real-time SSE stream for Logcat
        const serial = query.serial || '';
        const filter = query.filter || '';

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const logcat = spawn(ADB_BIN, [...(serial ? ['-s', serial] : []), 'logcat', '-v', 'time']);

        logcat.stdout.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            if (filter && !line.toLowerCase().includes(filter.toLowerCase())) continue;
            res.write(`data: ${JSON.stringify({ line })}\n\n`);
          }
        });

        req.on('close', () => {
          logcat.kill();
        });
        return;
      }

      if (pathname === '/api/restart-adb' && req.method === 'POST') {
        await execCommand(`"${ADB_BIN}" kill-server`);
        await execCommand(`"${ADB_BIN}" start-server`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'ADB Server restarted successfully.' }));
        return;
      }

      if (pathname === '/api/connect-wireless' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
          const data = JSON.parse(body || '{}');
          const address = data.address || '';
          if (!address) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'IP address is required.' }));
            return;
          }
          const out = await execCommand(`"${ADB_BIN}" connect ${address}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: !out.error, output: out.stdout || out.stderr }));
        });
        return;
      }

      // Serve Static UI Assets
      let filePath = path.join(__dirname, 'ui', pathname === '/' ? 'index.html' : pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.json': 'application/json'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found\n');
    } catch (e) {
      console.error('[PCstarter Server Error]', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });

  return server;
}

function startServer(port = PORT) {
  const server = createServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`[PCstarter] Service running on http://127.0.0.1:${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, createServer, PORT };
