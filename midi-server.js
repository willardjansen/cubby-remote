#!/usr/bin/env node
/**
 * MIDI Bridge Server
 *
 * Bidirectional MIDI bridge between browser/iPad and Cubase:
 * - Receives MIDI from browser via WebSocket → sends to Cubase via "Browser to Cubase"
 * - Receives MIDI from Cubase via "Cubase to Browser" → sends to browser via WebSocket
 *
 * Usage: node midi-server.js
 */

const WebSocket = require('ws');
const JZZ = require('jzz');
const midi = require('midi');
const os = require('os');

const WS_PORT = 7101;

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// MIDI ports
let midiOut = null;      // Output to Cubase ("Browser to Cubase")
let midiIn = null;       // Input from Cubase ("Cubase to Browser")
let selectedOutPortName = null;
let selectedInPortName = null;

// Track name parsing state (for CC protocol from Cubase)
let trackNameBuffer = '';
let trackNameLength = 0;
let isReceivingTrackName = false;

// Connected WebSocket clients
let wsClients = new Set();

// Initialize MIDI
async function initMidi() {
  console.log('\n🎹 MIDI Bridge Server (Bidirectional)');
  console.log('=====================================\n');

  const info = JZZ().info();
  const outputs = info.outputs;
  const inputs = info.inputs;

  // List available MIDI ports
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

  // --- Set up OUTPUT (Browser → Cubase) ---
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
      console.log(`✅ Output: ${selectedOutPortName} (Browser → Cubase)`);
    } catch (e) {
      console.error(`❌ Failed to open MIDI output: ${e.message}`);
    }
  } else {
    console.log('⚠️  No MIDI output found for Browser → Cubase');
  }

  // --- Set up INPUT (Cubase → Browser) using 'midi' package ---
  const midiInput = new midi.Input();
  const inputCount = midiInput.getPortCount();

  console.log('Available MIDI inputs (midi package):');
  for (let i = 0; i < inputCount; i++) {
    console.log(`  ${i}: ${midiInput.getPortName(i)}`);
  }

  // Find Cubase to Browser port
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
        console.log(`🔵 RAW MIDI IN: [${message.join(', ')}]`);
        handleMidiFromCubase(message);
      });

      midiInput.openPort(inputPortIndex);
      midiIn = midiInput;
      console.log(`✅ Input: ${selectedInPortName} (Cubase → Browser)`);
    } catch (e) {
      console.error(`❌ Failed to open MIDI input: ${e.message}`);
    }
  } else {
    console.log('⚠️  No "ArticulationRemote" input found - track switching disabled');
    console.log('   Create this port in loopMIDI if you want auto track switching');
  }

  console.log('');
}

// Handle incoming MIDI from Cubase (track name protocol)
function handleMidiFromCubase(msg) {
  const status = msg[0];
  const data1 = msg[1];
  const data2 = msg[2];

  // We only care about CC on channel 16 (0xBF)
  if (status !== 0xBF) return;

  if (data1 === 119) {
    // CC 119: Start of track name, value = length
    trackNameBuffer = '';
    trackNameLength = data2;
    isReceivingTrackName = true;
    console.log(`📥 Track name start (length: ${trackNameLength})`);
  } else if (data1 === 118 && isReceivingTrackName) {
    // CC 118: Character byte
    trackNameBuffer += String.fromCharCode(data2);
  } else if (data1 === 117 && isReceivingTrackName) {
    // CC 117: End of track name
    isReceivingTrackName = false;
    console.log(`📥 Track name received: "${trackNameBuffer}"`);

    // Broadcast to all connected WebSocket clients
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
      console.log(`📤 Sent track name to browser: "${trackName}"`);
    }
  });
}

// Send MIDI message to Cubase
function sendMidi(status, data1, data2) {
  const msg = [status, data1, data2];
  console.log(`🎵 MIDI Out: [${msg.join(', ')}]`);

  if (midiOut) {
    try {
      midiOut.send(msg);
    } catch (e) {
      console.error(`   Error: ${e.message}`);
    }
  }
}

// Start WebSocket server
function startServer() {
  const wss = new WebSocket.Server({ port: WS_PORT });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`📱 Client connected: ${clientIp}`);

    // Track this client for broadcasting
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
      console.log(`📱 Client disconnected: ${clientIp}`);
      wsClients.delete(ws);
    });

    // Send current status
    ws.send(JSON.stringify({
      type: 'connected',
      port: selectedOutPortName,
      inputPort: selectedInPortName,
      status: midiOut ? 'ready' : 'no-midi',
      trackSwitching: !!midiIn
    }));
  });

  const localIP = getLocalIP();
  console.log(`🌐 WebSocket server running on ws://localhost:${WS_PORT}`);
  console.log(`\n📱 On your iPad, open: http://${localIP}:7100`);
  console.log('   The app will automatically connect to this MIDI bridge.');
  if (midiIn) {
    console.log('   ✅ Track switching enabled - select tracks in Cubase to auto-switch maps');
  }
  console.log('');
}

// Main
async function main() {
  await initMidi();
  startServer();
}

main().catch(console.error);
