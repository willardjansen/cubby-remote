# Installation Guide

## Requirements

- **Windows** or **macOS** computer running Cubase 12+
- **iPad** or tablet with modern browser (Safari/Chrome) - optional
- **loopMIDI** (Windows) or **IAC Driver** (macOS) for MIDI routing

---

## Installation Methods

### Method 1: Standalone App (Recommended for End Users)

The easiest way to use Cubby Remote is with the standalone installer. No Node.js or terminal commands required!

**Download:**
- Windows: [Cubby Remote Setup 1.0.0.exe](https://github.com/willardjansen/cubase-articulation-remote/releases)
- macOS: Coming soon

**Install:**
1. Run the installer
2. Follow the setup wizard
3. Launch "Cubby Remote" from Start Menu or Desktop shortcut
4. The app runs in system tray and auto-opens browser at http://localhost:7100

**Benefits:**
- No Node.js installation needed
- No terminal commands
- System tray integration
- Auto-starts on Windows login (optional)
- Built-in MIDI server
- Easy expression map management via tray menu

Skip to **Step 2: Set Up Virtual MIDI Ports** below.

### Method 2: Development Mode (For Developers)

If you want to modify the code or run from source:

**Requirements:**
- **Node.js** 18+

```bash
# Clone or download the project
cd cubase-articulation-remote

# Install dependencies
npm install

# Start both servers
npm run all
```

The app runs at **http://localhost:7100**

---

## Step 2: Set Up Virtual MIDI Ports

### Windows: loopMIDI

1. **Download** [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html)
2. **Install** and run loopMIDI
3. Create **two** ports by clicking the **+** button:
   - `Browser to Cubase` (for sending articulations TO Cubase)
   - `ArticulationRemote` (for receiving track names FROM Cubase)
4. Keep loopMIDI running (it stays in the system tray)

**Tip:** Add loopMIDI to Windows Startup: Right-click in system tray → "Autostart"

### macOS: IAC Driver

1. Open **Audio MIDI Setup** (Applications → Utilities)
2. Go to **Window → Show MIDI Studio**
3. Double-click **IAC Driver**
4. Check **"Device is online"**
5. Add two buses:
   - `Browser to Cubase`
   - `ArticulationRemote`

---

## Step 3: Configure Cubase

### Windows (IMPORTANT - Prevent MIDI Feedback Loop)

1. **Disable MIDI Thru:**
   - Cubase → Preferences → MIDI → **Uncheck "MIDI Thru Active"**

2. **Configure MIDI Port Setup:**
   - Studio → Studio Setup → MIDI Port Setup
   - "Browser to Cubase" **Input**: State=Active, In 'All MIDI Inputs'=**Checked**
   - "Browser to Cubase" **Output**: **Uncheck "Visible"** (critical!)

3. Click **Apply**

> **Warning:** Without step 2, Cubase will freeze due to a MIDI feedback loop. This is a Windows/loopMIDI specific issue.

### macOS

1. In **MIDI Port Setup**, check "In 'All MIDI Inputs'" for IAC Driver
2. No special configuration needed - IAC Driver doesn't have the feedback issue

### Both Platforms

- Assign Expression Maps to your instrument tracks
- Ensure tracks have MIDI Input set to receive from the virtual port

---

## Step 4: Install Cubase MIDI Remote Script

This script enables **auto track switching** - the web app automatically loads the matching expression map when you select a track in Cubase.

### Windows

**Run PowerShell as Administrator:**

```powershell
# Create the folder structure
mkdir "C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\articulation\remote" -Force

# Copy the script
copy "cubase-midi-remote\articulation_remote.js" "C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\articulation\remote\"
```

### macOS

```bash
# Create the folder structure
sudo mkdir -p "/Applications/Cubase 15.app/Contents/midiremote_factory_scripts/Public/articulation/remote"

# Copy the script
sudo cp cubase-midi-remote/articulation_remote.js \
   "/Applications/Cubase 15.app/Contents/midiremote_factory_scripts/Public/articulation/remote/"
```

### Configure in Cubase

1. **Restart Cubase** (or open MIDI Remote Script Console and click "Reload Scripts")
2. Open **Studio → MIDI Remote Manager**
3. Click **"+ Add MIDI Controller Surface"**
4. Select **Vendor: articulation**, **Model: remote**
5. Ports should auto-detect to **ArticulationRemote**
   - If not, manually set Input and Output to ArticulationRemote
6. Click to activate the device

### Verify Installation

1. Open the **MIDI Remote Script Console** (find it via Studio menu or search)
2. At the bottom, under "MIDI Controller Scripts", confirm `remote` shows `ArticulationRemote` for both Input and Output ports
3. Switch tracks in Cubase - you should see messages like:
   ```
   ART-REMOTE: Track = "Violin"
   ART-REMOTE: SENDING "Violin"
   ```

---

## Step 5: Add Expression Maps

### For Standalone App Users

Use the system tray menu to manage expression maps:

1. **Right-click the Cubby Remote icon** in system tray (bottom right, near clock)
2. Choose one of:
   - **"Add Expression Maps..."** - Browse and import `.expressionmap` files
   - **"Open Expression Maps Folder"** - Open the folder to copy files manually

**Expression Maps Location:**
- Windows: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\resources\expression-maps\`
- macOS: Inside the app bundle

### For Development Mode Users

Place your `.expressionmap` files in the `expression-maps/` folder:

```
expression-maps/
├── Strings/
│   ├── Amati Viola.expressionmap
│   └── Guarneri Violin.expressionmap
├── Brass/
│   └── Trumpets.expressionmap
└── Woodwinds/
    └── Flute.expressionmap
```

### File Naming for Auto-Switching

**Important:** Name files to match your Cubase track names. The app uses fuzzy matching:
- Exact match: Track "Amati Viola" matches "Amati Viola.expressionmap"
- Contains: Track "Amati Viola Section" matches "Amati Viola.expressionmap"
- First word: Track "Violin Solo" matches "Violin.expressionmap"

---

## Step 6: Connect from iPad

1. Run `npm run all` on your computer
2. Note the IP address shown in the terminal (e.g., `192.168.1.40`)
3. On iPad, open Safari or Chrome
4. Navigate to `http://YOUR_IP:7100` (e.g., `http://192.168.1.40:7100`)

**Network Notes:**
- PC can be on Ethernet, iPad on WiFi - just need same network
- Firewall may need to allow ports 3000 and 3001
- Use 5GHz WiFi for lower latency

### Add to Home Screen (PWA)

1. In Safari, tap **Share** button
2. Tap **"Add to Home Screen"**
3. Name it "Cubase Remote"
4. Tap **Add**

The app now launches full-screen without browser UI.

---

## Troubleshooting

### "No MIDI" / No devices shown

**Windows:**
- Ensure loopMIDI is running (check system tray)
- Use Chrome or Edge (Firefox doesn't support Web MIDI)
- Restart browser after starting loopMIDI

**macOS:**
- Ensure IAC Driver is online in Audio MIDI Setup

**iPad:**
- iPad uses WebSocket, not Web MIDI - just needs MIDI bridge running

### Cubase hangs/freezes (Windows)

MIDI feedback loop. Fix:
1. Preferences → MIDI → Uncheck "MIDI Thru Active"
2. Studio Setup → MIDI Port Setup → Uncheck "Visible" for "Browser to Cubase" **Output**

### Auto track switching not working

Check each step in order:

1. **Script Console**: See `ART-REMOTE: Track = "..."` when switching tracks?
   - No → Device not connected. Check MIDI Remote Manager.

2. **loopMIDI**: ArticulationRemote port showing activity?
   - No → MIDI not being sent. Check ports in Script Console (bottom panel).

3. **midi-server terminal**: See `🔵 RAW MIDI IN: [191, 119, ...]`?
   - No → midi-server not receiving. Restart `npm run midi`.

4. **Web app**: Expression map loads?
   - No → Check file names match track names. Check browser console for errors.

### Articulations not switching in Cubase

1. Verify Expression Map is assigned to the track (Inspector)
2. Check track MIDI Input includes the loopMIDI/IAC port
3. Verify remote triggers are assigned in Expression Map Setup
4. Check browser console (F12) for MIDI output logs

### Duplicate MIDI Remote devices in Cubase

This can happen after modifying scripts. Fix:
1. Close Cubase
2. Delete folder: `C:\Users\[Username]\Documents\Steinberg\Cubase\MIDI Remote`
3. Restart Cubase
4. Re-add the articulation/remote device

### iPad not receiving track changes

1. Verify `npm run midi` is running
2. Check iPad is on same network as computer
3. Refresh the web app on iPad
4. Check midi-server shows "Client connected" when iPad opens the app

---

## Quick Reference

| What | Where |
|------|-------|
| Web app | http://localhost:7100 or http://YOUR_IP:7100 |
| MIDI bridge | Port 3001 (WebSocket) |
| Expression maps | `expression-maps/` folder |
| MIDI Remote script | `C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\articulation\remote\` |
| loopMIDI ports | "Browser to Cubase" + "ArticulationRemote" |

| Command | Description |
|---------|-------------|
| `npm run all` | Start both servers |
| `npm run dev` | Start web server only |
| `npm run midi` | Start MIDI bridge only |
| `npm run build` | Production build |
