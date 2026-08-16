// PCstarter Frontend App Logic

const API_BASE = 'http://127.0.0.1:8004';
let currentDevices = [];
let selectedDeviceSerial = '';
let autoScroll = true;
let logcatEventSource = null;
let mirrorInterval = null;

// Tab Switching
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    const pane = document.getElementById(tabId);
    if (pane) pane.classList.add('active');

    if (tabId === 'tab-debugger') {
      startLogcatStream();
    }
    if (tabId === 'tab-mirror') {
      startScreenMirroring();
    } else {
      stopScreenMirroring();
    }
  });
});

// Toast Helper
function showToast(msg, isError = false) {
  const toast = document.getElementById('bridgeToast');
  if (toast) {
    toast.textContent = msg;
    toast.style.color = isError ? 'var(--accent-rose)' : 'var(--accent-green)';
    setTimeout(() => {
      toast.textContent = '';
    }, 4000);
  }
}

// Fetch Devices
async function fetchDevices() {
  try {
    const res = await fetch(`${API_BASE}/api/devices`);
    const data = await res.json();
    if (data.success && data.devices) {
      currentDevices = data.devices;
      renderDevices(currentDevices);
      
      const count = currentDevices.length;
      document.getElementById('deviceCountLabel').textContent = `${count} DEVICE${count === 1 ? '' : 'S'} CONNECTED`;
      document.getElementById('liveDeviceBadge').textContent = `${count} Active`;
      
      if (!selectedDeviceSerial && currentDevices.length > 0) {
        selectedDeviceSerial = currentDevices[0].serial;
      }
    }
  } catch (e) {
    console.error('Failed to fetch devices:', e);
  }
}

// Render Devices
function renderDevices(devices) {
  const container = document.getElementById('devicesList');
  if (!container) return;

  if (devices.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
        <h3 style="color: var(--text-muted); margin-bottom: 8px;">No Devices Attached</h3>
        <p>Plug in an Android device via USB with USB Debugging enabled, or boot an emulator.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = devices.map(d => `
    <div class="device-card ${selectedDeviceSerial === d.serial ? 'selected' : ''}" data-serial="${d.serial}">
      <div class="device-card-header">
        <div class="device-icon-box">
          <svg class="device-icon-svg" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
        </div>
        <div class="device-title-info">
          <div class="device-name">${d.model}</div>
          <div class="device-serial">${d.serial} • ${d.isWireless ? 'WiFi' : 'USB'}</div>
        </div>
      </div>

      <div class="device-specs-grid">
        <div class="spec-item">
          <span class="spec-label">Android OS</span>
          <span class="spec-val">v${d.androidVersion} (API ${d.sdk})</span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Battery</span>
          <span class="spec-val">${d.battery}</span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Resolution</span>
          <span class="spec-val">${d.resolution}</span>
        </div>
        <div class="spec-item">
          <span class="spec-label">IP Address</span>
          <span class="spec-val">${d.ip}</span>
        </div>
      </div>

      <div class="device-card-actions">
        <button class="g-btn small primary btn-device-launch" data-serial="${d.serial}">Launch Companion</button>
        <button class="g-btn small outline btn-device-apk" data-serial="${d.serial}">Push APK</button>
      </div>
    </div>
  `).join('');

  // Attach card event listeners
  document.querySelectorAll('.btn-device-launch').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      launchCompanion(b.getAttribute('data-serial'));
    });
  });

  document.querySelectorAll('.btn-device-apk').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      pushApk(b.getAttribute('data-serial'));
    });
  });

  document.querySelectorAll('.device-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedDeviceSerial = card.getAttribute('data-serial');
      document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}

// Launch Companion
async function launchCompanion(serial) {
  showToast('Launching PolyCrest Companion on ' + (serial || 'connected device') + '...');
  try {
    const res = await fetch(`${API_BASE}/api/launch-companion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial })
    });
    const data = await res.json();
    showToast(data.message || 'Companion started successfully.');
  } catch (e) {
    showToast('Failed to launch companion: ' + e.message, true);
  }
}

// Push Companion APK
async function pushApk(serial) {
  showToast('Pushing and installing PolyCrest Companion APK...');
  try {
    const res = await fetch(`${API_BASE}/api/install-companion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial })
    });
    const data = await res.json();
    if (data.success) {
      showToast('PolyCrest Companion APK installed successfully!');
    } else {
      showToast('Install failed: ' + data.output, true);
    }
  } catch (e) {
    showToast('Error pushing APK: ' + e.message, true);
  }
}

// Port Forwarding
async function forwardPorts() {
  showToast('Forwarding ports tcp:8001 -> tcp:8001...');
  try {
    const res = await fetch(`${API_BASE}/api/forward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial: selectedDeviceSerial, localPort: '8001', remotePort: '8001' })
    });
    const data = await res.json();
    showToast(data.message || 'Ports forwarded successfully.');
  } catch (e) {
    showToast('Forwarding failed: ' + e.message, true);
  }
}

// Boot AVD
async function bootAvd(avdName) {
  showToast(`Booting emulator (${avdName || 'Default'})...`);
  try {
    const res = await fetch(`${API_BASE}/api/launch-avd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avdName })
    });
    const data = await res.json();
    showToast(data.message || 'Emulator boot sequence initiated.');
  } catch (e) {
    showToast('Failed to boot emulator: ' + e.message, true);
  }
}

// Fetch AVDs
async function fetchAvds() {
  try {
    const res = await fetch(`${API_BASE}/api/avds`);
    const data = await res.json();
    const list = document.getElementById('avdList');
    if (data.success && data.avds && data.avds.length > 0) {
      list.innerHTML = data.avds.map(name => `
        <div class="avd-item" data-avd="${name}">
          <div class="preset-name">${name}</div>
          <div class="preset-spec">⚡ Hardware Accelerated • 1-Click Launch</div>
        </div>
      `).join('');

      document.querySelectorAll('.avd-item').forEach(item => {
        item.addEventListener('click', () => {
          bootAvd(item.getAttribute('data-avd'));
        });
      });
    } else {
      list.innerHTML = `<div class="avd-item-empty">PolyCrest Virtual Device Engine is active. Click 'Boot Default Emulator' to launch.</div>`;
    }
  } catch (e) {}
}

// Logcat Real-time SSE Stream
function startLogcatStream() {
  if (logcatEventSource) logcatEventSource.close();

  const filter = document.getElementById('logcatSearch').value;
  const consoleEl = document.getElementById('logcatConsole');

  logcatEventSource = new EventSource(`${API_BASE}/api/logcat/stream?serial=${selectedDeviceSerial}&filter=${encodeURIComponent(filter)}`);

  logcatEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const line = data.line;
      if (!line) return;

      const div = document.createElement('div');
      div.className = 'terminal-line';
      if (line.includes(' E ') || line.includes('Error') || line.includes('Fatal') || line.includes('Exception')) {
        div.classList.add('error');
      } else if (line.includes(' W ') || line.includes('Warn')) {
        div.classList.add('warn');
      } else if (line.includes(' I ') || line.includes('PolyCrest')) {
        div.classList.add('info');
      } else if (line.includes(' D ')) {
        div.classList.add('debug');
      }
      div.textContent = line;
      consoleEl.appendChild(div);

      if (autoScroll) {
        consoleEl.scrollTop = consoleEl.scrollHeight;
      }
    } catch (e) {}
  };
}

// Screen Mirroring
function startScreenMirroring() {
  updateScreenFrame();
  if (mirrorInterval) clearInterval(mirrorInterval);
  mirrorInterval = setInterval(() => {
    const chk = document.getElementById('chkAutoMirror');
    if (chk && chk.checked) {
      updateScreenFrame();
    }
  }, 1000);
}

function stopScreenMirroring() {
  if (mirrorInterval) {
    clearInterval(mirrorInterval);
    mirrorInterval = null;
  }
}

function updateScreenFrame() {
  const img = document.getElementById('mirrorImage');
  const placeholder = document.getElementById('mirrorPlaceholder');
  if (!img) return;

  const url = `${API_BASE}/api/screenshot?serial=${selectedDeviceSerial}&t=${Date.now()}`;
  img.onload = () => {
    img.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
  };
  img.onerror = () => {
    img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
  };
  img.src = url;
}

// Event Listeners
document.getElementById('btnLaunchCompanion')?.addEventListener('click', () => launchCompanion(selectedDeviceSerial));
document.getElementById('btnForwardPorts')?.addEventListener('click', forwardPorts);
document.getElementById('btnPushCompanionApk')?.addEventListener('click', () => pushApk(selectedDeviceSerial));
document.getElementById('btnStartAvd')?.addEventListener('click', () => bootAvd(''));

document.querySelectorAll('.preset-item').forEach(item => {
  item.addEventListener('click', () => {
    const res = item.getAttribute('data-res');
    showToast(`Target Resolution preset selected: ${res}`);
    bootAvd('');
  });
});

document.getElementById('btnRefreshAll')?.addEventListener('click', () => {
  fetchDevices();
  fetchAvds();
  showToast('Synchronized with ADB & background services.');
});
document.getElementById('btnRestartAdb')?.addEventListener('click', async () => {
  showToast('Restarting ADB server...');
  await fetch(`${API_BASE}/api/restart-adb`, { method: 'POST' });
  setTimeout(fetchDevices, 1500);
});

document.getElementById('btnClearLogs')?.addEventListener('click', () => {
  const consoleEl = document.getElementById('logcatConsole');
  if (consoleEl) consoleEl.innerHTML = '';
});

document.getElementById('btnToggleAutoScroll')?.addEventListener('click', () => {
  autoScroll = !autoScroll;
  document.getElementById('btnToggleAutoScroll').textContent = `Auto-scroll: ${autoScroll ? 'ON' : 'OFF'}`;
});

document.getElementById('logcatSearch')?.addEventListener('input', () => {
  startLogcatStream();
});

document.getElementById('btnCaptureScreen')?.addEventListener('click', updateScreenFrame);

document.getElementById('btnConnectWifi')?.addEventListener('click', async () => {
  const address = document.getElementById('wifiIpInput').value.trim();
  const resEl = document.getElementById('wifiResult');
  if (!address) return;

  resEl.textContent = 'Connecting...';
  const res = await fetch(`${API_BASE}/api/connect-wireless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  const data = await res.json();
  resEl.textContent = data.output || (data.success ? 'Connected.' : 'Failed.');
  fetchDevices();
});

document.getElementById('btnCustomForward')?.addEventListener('click', async () => {
  const localPort = document.getElementById('localPortInput').value.trim();
  const remotePort = document.getElementById('remotePortInput').value.trim();
  const resEl = document.getElementById('forwardResult');

  const res = await fetch(`${API_BASE}/api/forward`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial: selectedDeviceSerial, localPort, remotePort })
  });
  const data = await res.json();
  resEl.textContent = data.message;
});

// Initial load
fetchDevices();
fetchAvds();
setInterval(fetchDevices, 4000);
