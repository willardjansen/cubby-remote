# Cubby Remote User Guide

A complete guide to using Cubby Remote for articulation switching in Cubase.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Auto Track Switching](#auto-track-switching)
4. [Template Analyzer](#template-analyzer)
5. [Template Builder](#template-builder)
6. [iPad Setup](#ipad-setup)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

#### Windows

1. Download `Cubby Remote Setup X.X.X.exe` from the [Releases page](https://github.com/willardjansen/cubby-remote/releases)
2. Run the installer
   - If you see "Windows protected your PC", click **More info** → **Run anyway**
3. Launch "Cubby Remote" from the Start Menu or Desktop shortcut
4. The app runs in your system tray (look for the icon near the clock)

#### macOS

1. Download `Cubby Remote-X.X.X.dmg` (Intel) or `Cubby Remote-X.X.X-arm64.dmg` (Apple Silicon)
2. Open the DMG and drag Cubby Remote to Applications
3. If you see "Cubby Remote is damaged", open Terminal and run:
   ```bash
   xattr -cr "/Applications/Cubby Remote.app"
   ```
4. Launch Cubby Remote - it appears in your menu bar

### First Launch

When you start Cubby Remote:
1. The app icon appears in your system tray (Windows) or menu bar (Mac)
2. Your default browser opens to http://localhost:7100
3. The built-in MIDI server starts automatically

### Virtual MIDI Setup

Cubby Remote needs virtual MIDI ports to communicate with Cubase.

#### Windows (loopMIDI)

1. Download and install [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html)
2. Create two ports:
   - `Browser to Cubase` - sends articulation triggers TO Cubase
   - `ArticulationRemote` - receives track names FROM Cubase

#### macOS (IAC Driver)

1. Open **Audio MIDI Setup** (in Applications → Utilities)
2. Go to **Window → Show MIDI Studio**
3. Double-click **IAC Driver**
4. Check **"Device is online"**
5. Add two buses named `Browser to Cubase` and `ArticulationRemote`

### Cubase Configuration

**Important for Windows users:** Prevent MIDI feedback loops!

1. **Preferences → MIDI** → Uncheck **"MIDI Thru Active"**
2. **Studio → Studio Setup → MIDI Port Setup**:
   - "Browser to Cubase" Input: Active, In 'All MIDI Inputs' = **Checked**
   - "Browser to Cubase" Output: **Uncheck "Visible"**

---

## Basic Usage

### Loading Expression Maps

**Method 1: Drag and Drop**
1. Drag `.expressionmap` files from your computer onto the web interface
2. Multiple files can be dropped at once - they'll be merged

**Method 2: Using Server Maps**
1. Click the folder icon in the top-right corner
2. Browse your expression maps library
3. Click to load any map

**Method 3: Adding to the App's Library**
1. Right-click the tray icon → **"Add Expression Maps..."**
2. Select one or more `.expressionmap` files
3. They're copied to the app's expression-maps folder

### Switching Articulations

1. In Cubase, select a track with an Expression Map assigned
2. In the web app, tap an articulation button
3. The articulation switches in Cubase

**How it works:** The app sends MIDI "remote trigger" notes that Cubase's Expression Map system recognizes.

### Managing Expression Maps

**Open the Expression Maps Folder:**
- Right-click tray icon → **"Open Expression Maps Folder"**
- Add, remove, or organize your `.expressionmap` files
- Subfolders are supported for organization

---

## Auto Track Switching

The killer feature! When you select a track in Cubase, the app automatically loads the matching expression map.

### Setup the MIDI Remote Script

**Step 1: Copy the Script**

1. Right-click tray icon → **"Open Cubase Script Folder"**
2. Copy `articulation_remote.js` to your Cubase scripts folder:

**Windows:**
```
C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\articulation\remote\
```

**macOS:**
```
/Applications/Cubase 15.app/Contents/midiremote_factory_scripts/Public/articulation/remote/
```

Create the `articulation/remote/` folders if they don't exist.

**Step 2: Configure in Cubase**

1. Restart Cubase (or click "Reload Scripts" in the MIDI Remote Script Console)
2. Open **Studio → MIDI Remote Manager**
3. Click **"+ Add MIDI Controller Surface"**
4. Select **Vendor: articulation**, **Model: remote**
5. Set both Input and Output ports to **ArticulationRemote**

**Step 3: Verify It's Working**

1. Open the MIDI Remote Script Console (separate window)
2. Switch between tracks in Cubase
3. You should see: `ART-REMOTE: Track = "Your Track Name"`

### Naming Requirements

For auto-switching to work, **track names must match expression map file names**.

| Track Name in Cubase | Expression Map File |
|---------------------|---------------------|
| `Violin 1` | `Violin 1.expressionmap` |
| `Amati Viola` | `Amati Viola.expressionmap` |
| `Brass Ensemble` | `Brass Ensemble.expressionmap` |

**Partial matching is supported:** Track `Viola 1` will match `Amati Viola.expressionmap` if no exact match exists.

---

## Template Analyzer

Already have a large Cubase template with expression maps assigned? Use the Template Analyzer to set up auto-switching!

### What It Does

The Template Analyzer:
1. Scans your `.cpr` file to find track names
2. Finds which expression maps are assigned to each track
3. Shows you the track → expression map relationships
4. Copies expression maps with track-matching names

### How to Use

**Step 1: Analyze Your Template**

1. Right-click tray icon → **"Analyze Template (.cpr)..."**
2. Select your Cubase project file
3. Review the analysis:
   - ✓ Matched tracks with their expression maps
   - ⚠ Unmatched items (potential naming mismatches)

**Step 2: Copy Expression Maps**

1. Click **"Copy Expression Maps"**
2. Select the folder containing your original expression maps
3. The tool copies and renames files to match track names:
   - Original: `NICRQ Stradivari Violin Multi Mic A.expressionmap`
   - Copied as: `Stradivari Violin.expressionmap`
4. Click **"Open Folder"** to see the copied files

**Step 3: Test Auto-Switching**

1. Select tracks in Cubase
2. Watch the web app automatically load matching expression maps!

### Command Line Alternative

For advanced users or batch processing:

```bash
# Analyze a template
node rename-tracks-to-expmaps.js my-template.cpr

# Analyze and copy expression maps
node rename-tracks-to-expmaps.js my-template.cpr --copy-maps ~/MyExpressionMaps ./expression-maps
```

---

## Template Builder

Starting fresh? Use the Template Builder to create Cubase projects where track names already match your expression maps.

### Access the Template Builder

- **In-app:** Click the template icon (grid) in the top-right corner
- **Direct URL:** http://localhost:7100/template-builder

### Creating a Template

**Step 1: Select Expression Maps**

1. Browse the folder tree showing your expression maps
2. Check the folders or individual maps you want to include
3. The track count updates as you select

**Step 2: Generate the DAWproject**

1. Click **"Generate DAWproject"**
2. Save the `.dawproject` file

**Step 3: Import to Cubase**

1. In Cubase: **File → Import → DAWproject...**
2. Select your generated file
3. Tracks are created with names matching your expression map files

**Step 4: One-Time Setup**

1. Assign expression maps to the tracks
2. **File → Save as Template...**
3. Future projects can start from this template with all maps pre-assigned!

### Benefits

- **Perfect name matching** - no fuzzy matching issues
- **Reusable** - create the template once, use forever
- **Flexible** - mix expression maps from different libraries

---

## iPad Setup

Use your iPad as a wireless articulation controller!

### Connect to the App

1. Ensure iPad and computer are on the same network
2. Find your computer's IP address:
   - **Windows:** Run `ipconfig` in Command Prompt
   - **Mac:** System Preferences → Network
   - Or check the tray menu - it shows the URL
3. On iPad Safari, go to: `http://YOUR_IP:7100`

### Install as a Web App (PWA)

For the best experience, add to Home Screen:

1. Open the app in Safari
2. Tap the Share button
3. Tap **"Add to Home Screen"**
4. Now it launches like a native app!

### iPad Features

- Full touch-optimized interface
- Same auto track switching
- No special apps needed
- Works over WiFi

---

## Troubleshooting

### Auto Track Switching Not Working

**Check each step in the chain:**

1. **MIDI Remote Script Console** - Do you see `ART-REMOTE: Track = "..."` when switching tracks?
   - No → Script not installed correctly, or MIDI Remote device not connected

2. **loopMIDI/IAC Driver** - Does ArticulationRemote show activity?
   - No → Check ports are set correctly in MIDI Remote Manager

3. **Tray menu → View MIDI Server Log** - Do you see `RAW MIDI IN` messages?
   - No → MIDI server not receiving from ArticulationRemote port

4. **Web app** - Does the expression map load?
   - No → Track name doesn't match any expression map file name

### Cubase Freezes (Windows)

This is a MIDI feedback loop. Fix:
1. **Preferences → MIDI** → Uncheck **"MIDI Thru Active"**
2. **Studio Setup → MIDI Port Setup** → Uncheck "Visible" for "Browser to Cubase" output

### iPad Shows "MIDI Bridge Not Running"

The MIDI server isn't reachable:
1. Check Cubby Remote is running (tray icon visible)
2. Check firewall isn't blocking port 3001
3. Check iPad and computer are on same network

### Articulations Don't Switch in Cubase

1. Ensure the track has an Expression Map assigned
2. Check Cubase MIDI input settings include the virtual MIDI port
3. Verify the expression map has remote triggers assigned

### Expression Map Not Loading on Track Change

1. Check track name matches expression map filename
2. Try the Template Analyzer to see the actual names in your template
3. Use partial matching: `Violin 1` will match `Solo Violin.expressionmap`

### Windows SmartScreen Warning

This appears because the app isn't code-signed (certificates cost $300+/year).

**To proceed:**
1. Click **"More info"**
2. Click **"Run anyway"**

The app is open source - review the code at https://github.com/willardjansen/cubby-remote

### macOS "App is Damaged" Error

This is macOS blocking unsigned apps. Fix:
```bash
xattr -cr "/Applications/Cubby Remote.app"
```

### View MIDI Server Log

For debugging MIDI issues:
1. Right-click tray icon → **"View MIDI Server Log"**
2. Look for error messages about:
   - Missing MIDI ports
   - WebSocket connection issues
   - Track name messages

---

## Quick Reference

### Tray Menu Options

| Menu Item | Description |
|-----------|-------------|
| Open in Browser | Opens http://localhost:7100 |
| iPad: http://... | Shows the URL for iPad access |
| Add Expression Maps... | Import .expressionmap files |
| Open Expression Maps Folder | Opens the folder in Explorer/Finder |
| Analyze Template (.cpr)... | Analyze a Cubase project for track/expression map setup |
| Open Cubase Script Folder | Opens folder with MIDI Remote script |
| MIDI Out/In | Shows current MIDI port status |
| View MIDI Server Log | Opens log file for troubleshooting |
| Quit | Closes the app |

### Keyboard Shortcuts (Web App)

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Focus search |
| `Escape` | Clear search |
| `1-9` | Quick select first 9 articulations |

### File Locations

**Windows:**
- Expression Maps: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\resources\expression-maps\`
- MIDI Log: `C:\Users\USERNAME\AppData\Roaming\cubby-remote\midi-server.log`

**macOS:**
- Expression Maps: `/Applications/Cubby Remote.app/Contents/Resources/expression-maps/`
- MIDI Log: `~/Library/Application Support/cubby-remote/midi-server.log`

---

## Getting Help

- **GitHub Issues:** https://github.com/willardjansen/cubby-remote/issues
- **Source Code:** https://github.com/willardjansen/cubby-remote

---

*Cubby Remote is free software licensed under GPL-3.0. If you paid for this, you were scammed!*
