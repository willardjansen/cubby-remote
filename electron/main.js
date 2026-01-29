const { app, Tray, Menu, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Configuration
const WS_PORT = 7101;
const NEXT_PORT = 7100;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// References
let tray = null;
let midiServerProcess = null;

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

// Cubase MIDI Remote script directory
function getCubaseScriptDir() {
  return isDev
    ? path.join(__dirname, '..', 'cubase-midi-remote')
    : path.join(process.resourcesPath, 'cubase-midi-remote');
}

// MIDI state (for tray menu display only)
let selectedOutPortName = 'Starting...';
let selectedInPortName = 'Starting...';

// Get local IP address
function getLocalIP() {
  const os = require('os');
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

// Find Node.js executable
function findNodeExecutable() {
  // Try process.execPath first (might be Node.js itself)
  if (process.execPath && process.execPath.includes('node')) {
    return process.execPath;
  }

  // Common installation paths
  const possiblePaths = [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'nodejs', 'node.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
  ];

  // Check if any exist
  for (const nodePath of possiblePaths) {
    if (fs.existsSync(nodePath)) {
      console.log('Found Node.js at:', nodePath);
      return nodePath;
    }
  }

  // Fallback to 'node' and hope it's in PATH
  console.log('Using "node" from PATH');
  return 'node';
}

// Start MIDI server as a separate Node.js process
function startMidiServer() {
  const logPath = path.join(app.getPath('userData'), 'midi-server.log');
  const log = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    try {
      fs.appendFileSync(logPath, logMsg);
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  };

  log('\n=== Starting MIDI Bridge Server ===\n');

  const midiServerPath = isDev
    ? path.join(__dirname, '..', 'midi-server.js')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'midi-server.js');

  log(`MIDI server path: ${midiServerPath}`);
  log(`File exists: ${fs.existsSync(midiServerPath)}`);

  if (!fs.existsSync(midiServerPath)) {
    log(`ERROR: MIDI server not found at: ${midiServerPath}`);
    return;
  }

  const serverCwd = isDev
    ? path.join(__dirname, '..')
    : path.join(process.resourcesPath, 'app.asar.unpacked');

  const nodeExecutable = findNodeExecutable();
  log(`Using Node.js executable: ${nodeExecutable}`);
  log(`Node.js exists: ${fs.existsSync(nodeExecutable)}`);
  log(`Starting MIDI server with cwd: ${serverCwd}`);
  log(`Log file: ${logPath}`);

  // Spawn midi-server.js using system Node.js
  try {
    midiServerProcess = spawn(nodeExecutable, [midiServerPath], {
      stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr
      cwd: serverCwd
    });

    log(`MIDI server process spawned, PID: ${midiServerProcess.pid}`);

    // Log MIDI server output
    midiServerProcess.stdout.on('data', (data) => {
      log(`[MIDI Server] ${data.toString().trim()}`);
    });

    midiServerProcess.stderr.on('data', (data) => {
      log(`[MIDI Server Error] ${data.toString().trim()}`);
    });

    midiServerProcess.on('error', (err) => {
      log(`ERROR: Failed to start MIDI server: ${err.message}`);
      log(`ERROR stack: ${err.stack}`);
    });

    midiServerProcess.on('exit', (code, signal) => {
      log(`MIDI server exited with code ${code}, signal ${signal}`);
    });
  } catch (err) {
    log(`EXCEPTION while spawning: ${err.message}`);
    log(`EXCEPTION stack: ${err.stack}`);
  }
}

// Simple static file server for production
const http = require('http');

let httpServer = null;

function startNextServer() {
  return new Promise((resolve) => {
    if (isDev) {
      console.log('Development mode - connect to Next.js dev server at http://localhost:7100');
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
          // Try with /index.html for directory routes (e.g., /template-builder)
          const indexPath = path.join(fullPath, 'index.html');
          fs.readFile(indexPath, (err2, data2) => {
            if (err2) {
              // Try with .html extension for Next.js routes
              fs.readFile(fullPath + '.html', (err3, data3) => {
                if (err3) {
                  // Fallback to root index.html for SPA routing
                  fs.readFile(path.join(outDir, 'index.html'), (err4, data4) => {
                    if (err4) {
                      res.writeHead(404);
                      res.end('Not Found');
                    } else {
                      res.writeHead(200, { 'Content-Type': 'text/html' });
                      res.end(data4);
                    }
                  });
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
      label: 'Analyze Template (.cpr)...',
      click: handleAnalyzeTemplate
    },
    { type: 'separator' },
    {
      label: 'Open Cubase Script Folder',
      click: () => {
        shell.openPath(getCubaseScriptDir());
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
      label: 'View MIDI Server Log',
      click: () => {
        const logPath = path.join(app.getPath('userData'), 'midi-server.log');
        if (fs.existsSync(logPath)) {
          shell.openPath(logPath);
        } else {
          dialog.showMessageBox({
            type: 'info',
            title: 'Log File',
            message: `Log file not found at:\n${logPath}`,
            buttons: ['OK']
          });
        }
      }
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

// Handle analyzing Cubase template for track/expression map mappings
async function handleAnalyzeTemplate() {
  // Import the analyzer
  const analyzerPath = isDev
    ? path.join(__dirname, '..', 'rename-tracks-to-expmaps.js')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'rename-tracks-to-expmaps.js');

  if (!fs.existsSync(analyzerPath)) {
    dialog.showErrorBox('Error', `Analyzer not found at:\n${analyzerPath}`);
    return;
  }

  const { analyzeCprFile, copyExpressionMaps } = require(analyzerPath);

  // Select .cpr file
  const result = await dialog.showOpenDialog({
    title: 'Select Cubase Template (.cpr)',
    filters: [
      { name: 'Cubase Projects', extensions: ['cpr'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) return;

  const cprFile = result.filePaths[0];

  try {
    // Analyze the template
    const analysis = analyzeCprFile(cprFile);

    if (analysis.mappings.length === 0) {
      const trackList = analysis.tracks.length > 0
        ? `\n\nTracks found:\n${analysis.tracks.slice(0, 10).map(t => `  • ${t}`).join('\n')}${analysis.tracks.length > 10 ? `\n  ... and ${analysis.tracks.length - 10} more` : ''}`
        : '';

      dialog.showMessageBox({
        type: 'info',
        title: 'No Mappings Found',
        message: 'No track/expression map mappings found.',
        detail: `This template may not have expression maps assigned.${trackList}`,
        buttons: ['OK']
      });
      return;
    }

    // Build summary message
    let message = `Found ${analysis.mappings.length} track → expression map mapping(s):\n\n`;
    analysis.mappings.forEach((m, i) => {
      message += `${i + 1}. "${m.trackName}"\n    → ${m.expMapFileName}\n\n`;
    });

    if (analysis.unmatchedExpMaps.length > 0) {
      message += `\n⚠ Unmatched expression maps: ${analysis.unmatchedExpMaps.length}`;
    }
    if (analysis.unmatchedTracks.length > 0) {
      message += `\n⚠ Unmatched tracks: ${analysis.unmatchedTracks.length}`;
    }

    // Ask user what to do
    const response = await dialog.showMessageBox({
      type: 'info',
      title: 'Template Analysis',
      message: `Analyzed: ${path.basename(cprFile)}`,
      detail: message,
      buttons: ['Copy Expression Maps', 'Close'],
      defaultId: 0,
      cancelId: 1
    });

    if (response.response === 0) {
      // User wants to copy expression maps
      await handleCopyExpressionMaps(analysis.mappings, copyExpressionMaps);
    }

  } catch (err) {
    dialog.showErrorBox('Error', `Failed to analyze template:\n${err.message}`);
  }
}

// Handle copying expression maps with track-matching names
async function handleCopyExpressionMaps(mappings, copyExpressionMaps) {
  // Ask for source directory
  const sourceResult = await dialog.showOpenDialog({
    title: 'Select Expression Maps Source Folder',
    message: 'Select the folder containing your expression map files',
    properties: ['openDirectory']
  });

  if (sourceResult.canceled) return;

  const sourceDir = sourceResult.filePaths[0];
  const destDir = getExpressionMapsDir();

  try {
    const results = copyExpressionMaps(mappings, sourceDir, destDir);

    let message = '';
    if (results.copied.length > 0) {
      message += `✓ Copied ${results.copied.length} expression map(s):\n`;
      results.copied.forEach(c => {
        message += `  • ${c.track}.expressionmap\n`;
      });
    }

    if (results.notFound.length > 0) {
      message += `\n✗ Not found (${results.notFound.length}):\n`;
      results.notFound.forEach(n => {
        message += `  • ${n.expected}\n`;
      });
    }

    dialog.showMessageBox({
      type: results.notFound.length > 0 ? 'warning' : 'info',
      title: 'Copy Complete',
      message: `Copied to: ${destDir}`,
      detail: message,
      buttons: ['Open Folder', 'Close'],
      defaultId: 0
    }).then(response => {
      if (response.response === 0) {
        shell.openPath(destDir);
      }
    });

  } catch (err) {
    dialog.showErrorBox('Error', `Failed to copy expression maps:\n${err.message}`);
  }
}

// Cleanup on quit
function cleanup() {
  if (midiServerProcess) {
    console.log('Stopping MIDI server...');
    midiServerProcess.kill();
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

  // Start MIDI server as separate process
  startMidiServer();

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
