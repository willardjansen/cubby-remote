const { app, Tray, Menu, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// MIDI server dependencies
const WebSocket = require('ws');
const JZZ = require('jzz');
const midi = require('midi');
const os = require('os');

// Configuration
const WS_PORT = 3001;
const NEXT_PORT = 3000;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// References
let tray = null;

// Expression maps directory - use project folder
function getExpressionMapsDir() {
  const mapsDir = isDev
    ? path.join(__dirname, '..', 'expression-maps')
    : path.join(process.resourcesPath, 'expression-maps');

  // Create directory if it doesn't exist
  if (!fs.existsSync(mapsDir)) {
    fs.mkdirSync(mapsDir, { recursive: true });
  }

  return mapsDir;
}

// MIDI state
let midiOut = null;
let midiIn = null;
let midiPing = null;
let selectedOutPortName = null;
let selectedInPortName = null;
let pingInterval = null;

// Track name parsing state
let trackNameBuffer = '';
let trackNameLength = 0;
let isReceivingTrackName = false;

// WebSocket clients
let wsClients = new Set();
let wss = null;

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Initialize MIDI
async function initMidi() {
  console.log('\n MIDI Bridge Server (Electron)');
  console.log('=====================================\n');

  const info = JZZ().info();
  const outputs = info.outputs;
  const inputs = info.inputs;

  console.log('Available MIDI outputs:');
  outputs.forEach((port, i) => {
    console.log(`  ${i + 1}. ${port.name}`);
  });
  console.log('');

  console.log('Available MIDI inputs:');
  inputs.forEach((port, i) => {
    console.log(`  ${i + 1}. ${port.name}`);
  });
  console.log('');

  // Set up OUTPUT (Browser → Cubase)
  const preferredOutNames = ['Browser to Cubase', 'Browser to cubase', 'IAC Driver', 'loopMIDI'];

  for (const preferred of preferredOutNames) {
    const found = outputs.find(p => p.name.toLowerCase().includes(preferred.toLowerCase()));
    if (found) {
      selectedOutPortName = found.name;
      break;
    }
  }

  if (selectedOutPortName) {
    try {
      midiOut = JZZ().openMidiOut(selectedOutPortName);
      console.log(`Output: ${selectedOutPortName} (Browser → Cubase)`);
    } catch (e) {
      console.error(`Failed to open MIDI output: ${e.message}`);
    }
  } else {
    console.log('No MIDI output found for Browser → Cubase');
  }

  // Set up INPUT (Cubase → Browser)
  const midiInput = new midi.Input();
  const inputCount = midiInput.getPortCount();

  console.log('Available MIDI inputs (midi package):');
  for (let i = 0; i < inputCount; i++) {
    console.log(`  ${i}: ${midiInput.getPortName(i)}`);
  }

  const preferredInNames = ['ArticulationRemote', 'Articulation Remote', 'Cubase to Browser'];
  let inputPortIndex = -1;

  for (const preferred of preferredInNames) {
    for (let i = 0; i < inputCount; i++) {
      if (midiInput.getPortName(i).toLowerCase().includes(preferred.toLowerCase())) {
        inputPortIndex = i;
        selectedInPortName = midiInput.getPortName(i);
        break;
      }
    }
    if (inputPortIndex >= 0) break;
  }

  if (inputPortIndex >= 0) {
    try {
      midiInput.on('message', (deltaTime, message) => {
        // Only log non-ping messages
        if (message[1] !== 100) {
          console.log(`RAW MIDI IN: [${message.join(', ')}]`);
        }
        handleMidiFromCubase(message);
      });

      midiInput.openPort(inputPortIndex);
      midiIn = midiInput;
      console.log(`Input: ${selectedInPortName} (Cubase → Browser)`);

      // Open ArticulationRemote as OUTPUT to send pings
      const pingPort = outputs.find(p => p.name.toLowerCase().includes('articulationremote'));
      if (pingPort) {
        try {
          midiPing = JZZ().openMidiOut(pingPort.name);
          console.log(`Ping output: ${pingPort.name}`);

          pingInterval = setInterval(() => {
            if (midiPing) {
              midiPing.send([0xBF, 100, 1]);
            }
          }, 500);
        } catch (e) {
          console.log(`Could not open ping output: ${e.message}`);
        }
      }
    } catch (e) {
      console.error(`Failed to open MIDI input: ${e.message}`);
    }
  } else {
    console.log('No "ArticulationRemote" input found - track switching disabled');
  }

  console.log('');
}

// Handle incoming MIDI from Cubase
function handleMidiFromCubase(msg) {
  const status = msg[0];
  const data1 = msg[1];
  const data2 = msg[2];

  if (status !== 0xBF) return;

  if (data1 === 119) {
    trackNameBuffer = '';
    trackNameLength = data2;
    isReceivingTrackName = true;
    console.log(`Track name start (length: ${trackNameLength})`);
  } else if (data1 === 118 && isReceivingTrackName) {
    trackNameBuffer += String.fromCharCode(data2);
  } else if (data1 === 117 && isReceivingTrackName) {
    isReceivingTrackName = false;
    console.log(`Track name received: "${trackNameBuffer}"`);
    broadcastTrackName(trackNameBuffer);
  }
}

// Broadcast track name to all connected browsers
function broadcastTrackName(trackName) {
  const message = JSON.stringify({
    type: 'trackChange',
    trackName: trackName
  });

  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      console.log(`Sent track name to browser: "${trackName}"`);
    }
  });
}

// Send MIDI message to Cubase
function sendMidi(status, data1, data2) {
  const msg = [status, data1, data2];
  console.log(`MIDI Out: [${msg.join(', ')}]`);

  if (midiOut) {
    try {
      midiOut.send(msg);
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
}

// Start WebSocket server
function startWebSocketServer() {
  wss = new WebSocket.Server({ port: WS_PORT });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`Client connected: ${clientIp}`);

    wsClients.add(ws);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'midi') {
          sendMidi(msg.status, msg.data1, msg.data2);
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', port: selectedOutPortName }));
        }
      } catch (e) {
        console.error('Invalid message:', e.message);
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${clientIp}`);
      wsClients.delete(ws);
    });

    ws.send(JSON.stringify({
      type: 'connected',
      port: selectedOutPortName,
      inputPort: selectedInPortName,
      status: midiOut ? 'ready' : 'no-midi',
      trackSwitching: !!midiIn
    }));
  });

  const localIP = getLocalIP();
  console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
  console.log(`\nLocal: http://localhost:${NEXT_PORT}`);
  console.log(`iPad:  http://${localIP}:${NEXT_PORT}`);
  if (midiIn) {
    console.log('\nTrack switching enabled');
  }
  console.log('');
}

// Simple static file server for production
const http = require('http');

let httpServer = null;

function startNextServer() {
  return new Promise((resolve) => {
    if (isDev) {
      console.log('Development mode - connect to Next.js dev server at http://localhost:3000');
      resolve();
      return;
    }

    // In production, serve static files
    const staticDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'out');
    const staticDirAlt = path.join(__dirname, '..', 'out');

    let outDir = staticDir;
    if (!fs.existsSync(outDir)) {
      outDir = staticDirAlt;
    }

    if (!fs.existsSync(outDir)) {
      console.log('Static files not found at:', staticDir);
      console.log('Run "npm run dev" separately to use the web UI.');
      resolve();
      return;
    }

    console.log('Starting static file server...');
    console.log('Serving from:', outDir);

    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    httpServer = http.createServer((req, res) => {
      let filePath = req.url === '/' ? '/index.html' : req.url;

      // Remove query string
      filePath = filePath.split('?')[0];

      // Handle API routes - proxy to expression-maps folder
      if (filePath.startsWith('/api/expression-maps')) {
        handleApiRequest(req, res);
        return;
      }

      const fullPath = path.join(outDir, filePath);
      const ext = path.extname(fullPath);

      // Security check
      if (!fullPath.startsWith(outDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(fullPath, (err, data) => {
        if (err) {
          // Try with .html extension for Next.js routes
          fs.readFile(fullPath + '.html', (err2, data2) => {
            if (err2) {
              // Fallback to index.html for SPA routing
              fs.readFile(path.join(outDir, 'index.html'), (err3, data3) => {
                if (err3) {
                  res.writeHead(404);
                  res.end('Not Found');
                } else {
                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(data3);
                }
              });
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data2);
            }
          });
        } else {
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
          res.end(data);
        }
      });
    });

    httpServer.listen(NEXT_PORT, '0.0.0.0', () => {
      console.log(`Static server running on http://localhost:${NEXT_PORT}`);
      resolve();
    });

    httpServer.on('error', (err) => {
      console.error('Failed to start static server:', err);
      resolve();
    });
  });
}

// Handle API requests for expression maps
function handleApiRequest(req, res) {
  const mapsDir = getExpressionMapsDir();
  const url = new URL(req.url, `http://localhost:${NEXT_PORT}`);
  const filePath = url.searchParams.get('file');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && filePath) {
    // Return file content
    const fullPath = path.join(mapsDir, filePath);
    if (!fullPath.startsWith(mapsDir)) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid path' }));
      return;
    }
    fs.readFile(fullPath, 'utf-8', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'File not found' }));
      } else {
        res.setHeader('Content-Type', 'application/xml');
        res.writeHead(200);
        res.end(data);
      }
    });
  } else if (req.method === 'GET') {
    // List all maps
    const maps = [];
    const scanDir = (dir, rel = '') => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const full = path.join(dir, item);
          const relPath = rel ? `${rel}/${item}` : item;
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            scanDir(full, relPath);
          } else if (item.endsWith('.expressionmap')) {
            maps.push({ name: item.replace('.expressionmap', ''), path: relPath, folder: rel || 'Root' });
          }
        }
      } catch (e) {}
    };
    scanDir(mapsDir);

    const grouped = {};
    maps.forEach(m => {
      if (!grouped[m.folder]) grouped[m.folder] = [];
      grouped[m.folder].push(m);
    });

    res.writeHead(200);
    res.end(JSON.stringify({ maps, grouped }));
  } else {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
}

// Create tray icon and menu
function createTray() {
  // Use custom tray icon - in production it's in Resources folder
  const trayIconPath = isDev
    ? path.join(__dirname, '..', 'build', 'tray-icon.png')
    : path.join(process.resourcesPath, 'tray-icon.png');

  let icon;
  if (fs.existsSync(trayIconPath)) {
    icon = nativeImage.createFromPath(trayIconPath);
    // Resize for menu bar (18x18 on macOS for better visibility)
    icon = icon.resize({ width: 18, height: 18 });
    // Don't use template mode - show the colored icon
  } else {
    // Fallback to a simple colored icon if custom icon not found
    console.log('Tray icon not found at:', trayIconPath);
    icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABqSURBVDiNY2AYBaMACMD4/xkYGP4zMDD8Z2Bg+I8uBpNjgsnBNP1HMQAmhiwHEwfpQTYAWS+yASheQDaAYi+gG0BSMKJrINkL6IaQ7AV0Q0j2ArohVPcCsh5yDCDLEJK9gGwISV5A1gsAW3sjrkm6gZ8AAAAASUVORK5CYII=');
  }

  tray = new Tray(icon);
  tray.setToolTip('Cubby Remote');

  updateTrayMenu();
}

// Update tray menu
function updateTrayMenu() {
  const localIP = getLocalIP();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Cubby Remote',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open in Browser',
      click: () => {
        shell.openExternal(`http://localhost:${NEXT_PORT}`);
      }
    },
    {
      label: `iPad: http://${localIP}:${NEXT_PORT}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Add Expression Maps...',
      click: handleAddExpressionMaps
    },
    {
      label: 'Open Expression Maps Folder',
      click: () => {
        shell.openPath(getExpressionMapsDir());
      }
    },
    { type: 'separator' },
    {
      label: `MIDI Out: ${selectedOutPortName || 'Not connected'}`,
      enabled: false
    },
    {
      label: `MIDI In: ${selectedInPortName || 'Not connected'}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        cleanup();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// Handle adding expression maps
async function handleAddExpressionMaps() {
  const result = await dialog.showOpenDialog({
    title: 'Add Expression Maps',
    filters: [
      { name: 'Expression Maps', extensions: ['expressionmap'] }
    ],
    properties: ['openFile', 'multiSelections']
  });

  if (result.canceled) return;

  const mapsDir = getExpressionMapsDir();
  let count = 0;

  for (const filePath of result.filePaths) {
    const filename = path.basename(filePath);
    const destPath = path.join(mapsDir, filename);

    try {
      fs.copyFileSync(filePath, destPath);
      count++;
      console.log(`Added: ${filename}`);
    } catch (e) {
      console.error(`Failed to copy ${filename}: ${e.message}`);
    }
  }

  if (count > 0) {
    console.log(`\nAdded ${count} expression map(s)`);
  }
}

// Cleanup on quit
function cleanup() {
  if (pingInterval) {
    clearInterval(pingInterval);
  }

  if (midiOut) {
    midiOut.close();
  }

  if (midiIn) {
    midiIn.closePort();
  }

  if (midiPing) {
    midiPing.close();
  }

  if (wss) {
    wss.close();
  }

  if (httpServer) {
    httpServer.close();
  }
}

// App lifecycle
app.whenReady().then(async () => {
  // Hide dock icon on macOS (tray app)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  try {
    await initMidi();
    startWebSocketServer();
  } catch (error) {
    console.error('Failed to initialize MIDI:', error);
  }

  // Always create tray, even if other things fail
  createTray();

  try {
    await startNextServer();
    // Auto-open browser only if server started
    setTimeout(() => {
      shell.openExternal(`http://localhost:${NEXT_PORT}`);
    }, 2000);
  } catch (error) {
    console.error('Failed to start Next.js server:', error);
  }

  console.log('\nApp running in system tray. Click the tray icon for options.');
});

app.on('window-all-closed', (e) => {
  // Don't quit when windows close - we're a tray app
  e.preventDefault();
});

app.on('before-quit', () => {
  cleanup();
});
