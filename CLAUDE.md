# CLAUDE.md - AI Assistant Handoff Guide

## Project Overview

Cubase Articulation Remote (branded as "Cubby Remote") is a Next.js web app that displays Cubase Expression Map articulations as tappable buttons. When tapped, buttons send MIDI remote trigger notes to Cubase to switch articulations. Works on iPad via WebSocket bridge. **Auto track switching** automatically loads the matching expression map when you select a track in Cubase.

**Deployment Options:**
1. **Standalone Electron App** (Recommended) - System tray app with built-in MIDI server, Windows installer available
2. **Development Mode** - Run with `npm run all` for local development

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Windows/Mac Host                          │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Next.js    │◀──▶│ MIDI Bridge  │◀──▶│    Cubase     │  │
│  │  Web App    │    │  Server      │    │               │  │
│  │  :3000      │    │  :3001       │    │               │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         ▲                  ▲                   ▲            │
└─────────│──────────────────│───────────────────│────────────┘
          │ HTTP             │ WebSocket         │ MIDI
          │                  │                   │
     ┌────┴──────────────────┴────┐         loopMIDI (Win)
     │         iPad               │         IAC Driver (Mac)
     │   Safari/Chrome Browser    │
     └────────────────────────────┘
```

**Data flows:**
- **Articulation switching (iPad → Cubase):** WebSocket → midi-server → "Browser to Cubase" loopMIDI → Cubase
- **Track switching (Cubase → iPad):** Cubase MIDI Remote script → "ArticulationRemote" loopMIDI → midi-server → WebSocket → Web App

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Cubase-themed colors
- **MIDI**: Web MIDI API + WebSocket fallback for iPad
- **MIDI Bridge**: Node.js with `jzz`, `midi`, and `ws` libraries
- **Storage**: localStorage for persistence

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main app component (track switching logic here)
│   │   ├── layout.tsx            # Root layout with PWA meta
│   │   ├── globals.css           # Tailwind + custom CSS
│   │   └── api/
│   │       └── expression-maps/
│   │           └── route.ts      # API for server-side maps
│   ├── components/
│   │   ├── ArticulationButton.tsx   # Individual articulation button
│   │   ├── ArticulationGrid.tsx     # Grid display with filtering
│   │   ├── FileDropZone.tsx         # Drag & drop file upload
│   │   ├── InstrumentLibrary.tsx    # Save/load + server maps
│   │   ├── MidiSettings.tsx         # MIDI device configuration
│   │   └── ServiceWorkerRegistration.tsx
│   └── lib/
│       ├── expressionMapParser.ts   # XML parsing & merging
│       └── midiHandler.ts           # Web MIDI + WebSocket + track name listeners
├── cubase-midi-remote/
│   └── articulation_remote.js    # Cubase MIDI Remote script (copy to factory scripts)
├── expression-maps/              # Server-side .expressionmap files
├── midi-server.js                # WebSocket MIDI bridge (bidirectional)
├── public/
│   ├── icon.svg
│   ├── manifest.json
│   └── sw.js
└── package.json
```

## Key Components

### 1. MIDI Handler (`src/lib/midiHandler.ts`)
- Tries Web MIDI API first
- Falls back to WebSocket connection to `ws://HOST:3001`
- `trackNameListeners` receive track name changes from Cubase
- `sendMessages()` routes to appropriate output

### 2. MIDI Bridge Server (`midi-server.js`)
- Node.js WebSocket server on port 3001
- **Bidirectional:**
  - Receives MIDI from browser → forwards to "Browser to Cubase" via `jzz`
  - Receives MIDI from "ArticulationRemote" via `midi` package → broadcasts track name to browsers
- Auto-detects local IP and displays it on startup

### 3. Cubase MIDI Remote Script (`cubase-midi-remote/articulation_remote.js`)
- Installed to:
  - Windows: `C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\articulation\remote\`
  - macOS: `/Applications/Cubase 15.app/Contents/midiremote_factory_scripts/Public/articulation/remote/`
- Sends track name when you select a track in Cubase
- Uses MIDI CC on channel 16 to encode track name as bytes

### 4. Expression Map Parser (`src/lib/expressionMapParser.ts`)
- Parses Cubase `.expressionmap` XML files
- Extracts `PSlotThruTrigger` remote trigger notes
- `autoAssignRemoteTriggers()` assigns C-2 upward for missing remotes

### 5. Server Maps API (`src/app/api/expression-maps/route.ts`)
- Lists .expressionmap files from `expression-maps/` folder
- Serves file content for loading
- Web app auto-loads matching map when track changes

## Commands

```bash
npm install            # Install dependencies
npm run dev            # Start Next.js (port 3000, network accessible)
npm run midi           # Start MIDI bridge (port 3001)
npm run all            # Start both servers
npm run build          # Next.js production build
npm run electron:dev   # Run Electron app in dev mode
npm run electron:build # Build installer (requires Windows Developer Mode)
npm run electron:pack  # Build unpacked app without installer
```

## Electron Standalone App

The project includes an Electron wrapper that creates a system tray application:

**Key Files:**
- `electron/main.js` - Main Electron process, handles tray, MIDI server, and browser
- `electron-builder.yml` - Build configuration
- `build/` - Icons and assets for installer

**Build Process:**
1. Enable Windows Developer Mode (Settings → For developers → Developer Mode ON)
2. Run `npm run electron:build`
3. Installer created at `dist/Cubby Remote Setup 1.0.0.exe` (~130 MB)

**Installed App:**
- Location: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\`
- Expression maps: `...cubby-remote\resources\expression-maps\`
- System tray menu provides: Add Maps, Open Maps Folder, Show App, Quit
- Built-in MIDI server (port 3001) starts automatically
- Auto-opens browser to http://localhost:3000 on launch

## Windows Setup

### Prerequisites
1. Install Node.js v21.6.2 from https://nodejs.org/dist/v21.6.2/node-v21.6.2-x64.msi
   - **Note:** This app requires Node.js v21.6.2 due to native MIDI module compatibility
2. Install loopMIDI: https://www.tobias-erichsen.de/software/loopmidi.html
3. Create **two** ports in loopMIDI:
   - `Browser to Cubase` (for sending articulations TO Cubase)
   - `ArticulationRemote` (for receiving track names FROM Cubase)

### Running
```bash
npm install
npm run midi    # Terminal 1
npm run dev     # Terminal 2
# Or: npm run all
```

### Cubase Setup (IMPORTANT - Prevent MIDI Feedback Loop)

1. **Disable MIDI Thru** (required to prevent feedback):
   - Preferences > MIDI > uncheck **"MIDI Thru Active"**

2. **Configure MIDI Port Setup** (Studio > Studio Setup > MIDI Port Setup):
   - "Browser to Cubase" **Input**:
     - State: Active
     - In 'All MIDI Inputs': **Checked**
   - "Browser to Cubase" **Output**:
     - Visible: **Unchecked** (prevents feedback loop)

3. Assign Expression Maps to tracks

**Why this matters:** On Windows with loopMIDI, if MIDI Thru is enabled and the output port is visible, Cubase creates a feedback loop that causes it to hang. macOS IAC Driver doesn't have this issue.

### iPad Access
1. Run `npm run midi` - it auto-detects and displays your IP
2. iPad Safari/Chrome: `http://YOUR_IP:3000` (shown in terminal)

**Note:** PC can be on Ethernet while iPad is on WiFi - they just need to be on the same network (router).

### Auto Track Switching Setup

This feature automatically loads the matching expression map when you select a track in Cubase.

1. **Install the MIDI Remote Script** (requires Admin PowerShell):
   ```powershell
   mkdir "C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\articulation\remote" -Force
   copy "cubase-midi-remote\articulation_remote.js" "C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\articulation\remote\"
   ```

2. **Restart Cubase** (or open MIDI Remote Script Console and click "Reload Scripts")

3. **Add the device in Cubase MIDI Remote Manager**:
   - Open Studio > MIDI Remote Manager
   - Click **"+ Add MIDI Controller Surface"**
   - Select Vendor: **articulation**, Model: **remote**
   - The ports should auto-detect to **ArticulationRemote**
   - If not, manually set both Input and Output to ArticulationRemote

4. **Verify in Script Console**:
   - Open the MIDI Remote Script Console (separate window)
   - At the bottom, under "MIDI Controller Scripts", confirm `remote` shows `ArticulationRemote` for both ports
   - When switching tracks, you should see `ART-REMOTE: Track = "TrackName"` messages

5. **Place expression maps on server**:
   - Put `.expressionmap` files in the `expression-maps/` folder
   - Name them to match your Cubase track names (e.g., `Amati Viola.expressionmap`)

6. **How it works**:
   - Cubase MIDI Remote script detects track selection change
   - Sends track name via CC messages on channel 16 to ArticulationRemote
   - midi-server.js receives via the `midi` npm package
   - Broadcasts to web app via WebSocket
   - Web app searches server maps for matching name and loads it

### Track Name Protocol (CC on channel 16 / 0xBF)
- CC 119: Start marker + name length
- CC 118: Character bytes (sent repeatedly)
- CC 117: End marker (value 127)

## macOS Setup

### Prerequisites
1. Install Node.js v21.6.2 from https://nodejs.org/dist/v21.6.2/node-v21.6.2.pkg
   - **Note:** This app requires Node.js v21.6.2 due to native MIDI module compatibility
   - Alternative: `brew install node@21` (may not get exact version)
2. Install Xcode Command Line Tools: `xcode-select --install`

### IAC Driver Setup
1. Open **Audio MIDI Setup** (in /Applications/Utilities)
2. Go to **Window > Show MIDI Studio**
3. Double-click the **IAC Driver** icon
4. Check **"Device is online"**
5. In the Ports section, click **+** to add two buses:
   - `Bus 1` (rename to `Browser to Cubase` if desired) - for sending articulations TO Cubase
   - `ArticulationRemote` - for receiving track names FROM Cubase
6. Click **Apply**

### Running
```bash
npm install
npm run all     # Starts both Next.js and MIDI bridge
```

### Cubase Setup (macOS)

Unlike Windows, macOS IAC Driver doesn't have the MIDI feedback loop issue, so setup is simpler:

1. **Configure MIDI Port Setup** (Studio > Studio Setup > MIDI Port Setup):
   - Ensure IAC Driver ports are visible and active

2. Assign Expression Maps to tracks

### Auto Track Switching Setup (macOS)

1. **Install the MIDI Remote Script** (requires admin password):
   ```bash
   sudo mkdir -p "/Applications/Cubase 15.app/Contents/midiremote_factory_scripts/Public/articulation/remote"

   sudo cp "cubase-midi-remote/articulation_remote.js" "/Applications/Cubase 15.app/Contents/midiremote_factory_scripts/Public/articulation/remote/"
   ```

2. **Restart Cubase** (or open MIDI Remote Script Console and click "Reload Scripts")

3. **Add the device in Cubase MIDI Remote Manager**:
   - Open Studio > MIDI Remote Manager
   - Click **"+ Add MIDI Controller Surface"**
   - Select Vendor: **articulation**, Model: **remote**
   - Set both Input and Output to **ArticulationRemote** (may show as "Browser to cubase ArticulationRemote")

4. **Verify in Script Console**:
   - Open the MIDI Remote Script Console
   - At the bottom, confirm `remote` shows ArticulationRemote for both ports
   - When switching tracks, you should see `ART-REMOTE: Track = "TrackName"` messages

5. **Place expression maps on server**:
   - Put `.expressionmap` files in the `expression-maps/` folder
   - Name them to match your Cubase track names (partial matching supported)

### iPad Access (from Mac)
1. Run `npm run midi` - it displays your Mac's IP address
2. iPad Safari/Chrome: `http://YOUR_IP:3000`
3. Mac and iPad must be on the same network

## Current State (Jan 2026)

### Working
- Load .expressionmap files via drag-drop
- Parse and display articulations
- Tap to send MIDI remote triggers
- WebSocket bridge for iPad
- Server-side expression map loading
- Multi-map merging
- Search/filter articulations
- **Auto track switching** - select track in Cubase, web app loads matching expression map
- Works on both PC browser and iPad

### Known Issues
- Cubase may show duplicate MIDI Remote devices after modifying scripts (delete MIDI Remote folder and restart to fix)
- Expression map names must match track names for auto-switching (partial matching supported)

## Code Patterns

### MIDI Send (ArticulationButton.tsx)
```typescript
const handleClick = () => {
  if (articulation.remoteTrigger) {
    const { status, data1 } = articulation.remoteTrigger;
    // Note On
    midiHandler.sendMessages([{ status, data1, data2: 127 }]);
    // Note Off after delay
    setTimeout(() => {
      midiHandler.sendMessages([{ status: status - 16, data1, data2: 0 }]);
    }, 50);
  }
};
```

### Track Name Callback in Cubase Script (CRITICAL PATTERN)
```javascript
// IMPORTANT: Assign mOnTitleChange directly to the HOST VALUE, not to a binding!
var trackVolume = page.mHostAccess.mTrackSelection.mMixerChannel.mValue.mVolume;

// Must create a binding for the callback to fire
page.makeValueBinding(fader.mSurfaceValue, trackVolume);

// Use .bind() to capture midiOutput in callback context
trackVolume.mOnTitleChange = (function(activeDevice, activeMapping, title) {
    // Send track name via MIDI
    this.midiOutput.sendMidi(activeDevice, [0xBF, 119, len]);
    // ... send character bytes ...
}).bind({ midiOutput: midiOutput });
```

### WebSocket Fallback (midiHandler.ts)
```typescript
if (this.useWebSocket && this.webSocket?.readyState === WebSocket.OPEN) {
  this.webSocket.send(JSON.stringify({ type: 'midi', status, data1, data2 }));
} else {
  this.selectedOutput.send([status, data1, data2]);
}
```

## Testing Checklist

1. [ ] `npm install` succeeds
2. [ ] `npm run midi` connects to loopMIDI/IAC Driver (shows both ports)
3. [ ] `npm run dev` starts on port 3000
4. [ ] Drop .expressionmap file loads
5. [ ] Tap articulation → MIDI sent → Cubase switches articulation
6. [ ] iPad connects via WebSocket and can switch articulations
7. [ ] Server Maps lists files from expression-maps/
8. [ ] **Auto track switching**: Select track in Cubase → Script Console shows `ART-REMOTE: Track = "..."` → loopMIDI shows activity → midi-server shows `RAW MIDI IN` → web app loads matching map

## Debugging Auto Track Switching

If track switching doesn't work, check each step:

1. **Script Console**: Do you see `ART-REMOTE: Track = "TrackName"` when switching tracks?
   - No → Script not firing. Check device is connected in MIDI Remote Manager.

2. **loopMIDI**: Does ArticulationRemote show activity when switching tracks?
   - No → MIDI not being sent. Check ports are set correctly in Script Console (bottom panel).

3. **midi-server terminal**: Do you see `RAW MIDI IN: [191, 119, ...]`?
   - No → midi-server not receiving. Check it's listening on ArticulationRemote.

4. **Web app**: Does the expression map change?
   - No → Check server maps are loaded, check matching logic (names must match).

## Notes for AI Assistants

- **Remote triggers**: Send `PSlotThruTrigger` data, NOT `midiMessages` (keyswitches)
- **Merged maps**: Each articulation has its own `midiChannel`
- **iPad support**: Must work via WebSocket when Web MIDI unavailable
- **Test on Windows**: loopMIDI required for virtual MIDI
- **MIDI Remote API**: Use `hostValue.mOnTitleChange` NOT `binding.mOnTitleChange`
- **MIDI Remote sendMidi**: Use array syntax `sendMidi(activeDevice, [0xBF, 119, len])` and `.bind({ midiOutput })` pattern
- **Factory scripts location**:
  - Windows: `C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\` (requires admin)
  - macOS: `/Applications/Cubase 15.app/Contents/midiremote_factory_scripts/Public/` (requires sudo)
- Run `npm run build` to verify no TypeScript errors
