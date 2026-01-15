# Windows Testing Note (Jan 15, 2026)

## What Was Done on Mac
- Converted the app to a standalone Electron app called "Cubby Remote"
- App runs as a system tray application (no window, opens browser for UI)
- Built Windows installer: `dist/Cubby Remote Setup 1.0.0.exe` (126 MB)
- The installer was cross-compiled from macOS

## What to Test on Windows

1. **Install the app** - Run `Cubby Remote Setup 1.0.0.exe`
   - Should create Start Menu shortcut
   - Should create Desktop shortcut (optional during install)

2. **Launch the app**
   - Should appear in system tray (bottom right, near clock)
   - Should NOT show a window
   - Should auto-open browser to http://localhost:3000

3. **Test MIDI connectivity**
   - Ensure loopMIDI is running with ports:
     - `Browser to Cubase`
     - `ArticulationRemote`
   - Check tray menu shows MIDI ports connected
   - Test articulation switching with Cubase

4. **Test expression map loading**
   - Use tray menu "Add Expression Maps..." to import .expressionmap files
   - Or use "Open Expression Maps Folder" and copy files manually
   - Maps should appear in browser UI under "Server Maps"

5. **Test auto track switching**
   - Select tracks in Cubase
   - Browser should auto-load matching expression map

## If Something Doesn't Work

### MIDI not working
The `midi` native module was cross-compiled. If it doesn't work:
```powershell
cd "path\to\cubase-articulation-remote"
npm rebuild midi
npm run electron:build
```

### App crashes on startup
Check Windows Event Viewer for errors, or run from command line:
```powershell
"C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\Cubby Remote.exe"
```

### Need to rebuild from source
```powershell
git pull
npm install
npm run electron:build
```
The installer will be at `dist/Cubby Remote Setup 1.0.0.exe`

## Files Location After Install
- App: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\`
- Expression maps: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\resources\expression-maps\`

---
Delete this file after Windows testing is complete.
