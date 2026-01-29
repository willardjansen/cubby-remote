# Progress Log

## 2026-01-29: v1.3.2 - Splash Screen & GitHub Actions CI/CD

### Added
- **Splash Screen**: Shows connection URL on startup with user acknowledgment
  - Displays local IP address for iPad/tablet connection
  - User clicks "Open in Browser" to continue (not auto-dismiss)
  - Includes startup status messages

- **GitHub Actions CI/CD**: Fully automated Mac builds
  - Builds on `macos-latest` with code signing and notarization
  - Manual trigger: `gh workflow run build.yml`
  - Automatic builds on version tags (`v*`)
  - Draft GitHub Release created with DMG artifacts

### Files Added
- `.github/workflows/build.yml` - CI/CD workflow
- `electron/splash.html` - Splash screen UI
- `electron/splash-preload.js` - IPC bridge for splash
- `build/notarize.js` - Dual-mode notarization (CI + local)

### Release
```bash
git tag v1.3.2 && git push origin v1.3.2
```
→ Builds Mac (Intel + ARM) with code signing → Creates draft GitHub Release

---

## 2026-01-29: v1.3.1 - Fixed MIDI Output in Packaged App

### Problem
MIDI output (articulation switching) wasn't working in the packaged Electron app, though track switching worked fine.

### Root Cause
The `JZZ` library doesn't work properly in packaged Electron apps - it returns empty MIDI port lists. The `midi` package (native Node.js MIDI) works reliably.

### Solution
- Switched from `JZZ` to `midi` package for MIDI output
- Updated `sendMidi()` to use `midiOut.sendMessage()` instead of `midiOut.send()`
- Now both input and output use the `midi` package consistently

### Also Fixed
- Auto port detection to avoid macOS AirPlay ports (3000, 5000, 7000)
- SSL/HTTPS support (disabled by default for easier tablet setup)
- Added troubleshooting for ERR_SSL_PROTOCOL_ERROR (use http://, incognito mode)

---

## 2026-01-18: Fixed Electron Build Hanging Issue

### Problem
Running `npm run electron:build` would hang during the Next.js build step and never complete.

### Root Cause
Next.js with `output: 'export'` (static export) cannot build projects that contain API routes. The presence of `src/app/api/expression-maps/route.ts` caused the build to hang indefinitely.

**Why this happened now:**
- The API route was added to support the template builder feature
- Recent commit `afd9c0f` fixed the template builder to use the correct expression maps folder
- This API route is needed for dev mode (`npm run dev`) but conflicts with static export builds
- The build likely hasn't been attempted since these changes, or Next.js became stricter about this incompatibility

### Solution
Created a custom build script (`build-electron.js`) that:
1. Temporarily renames `route.ts` → `route.ts.dev` to hide it from Next.js
2. Runs `next build` (completes successfully without the API route)
3. Runs `electron-builder` to create the installer
4. Restores `route.ts` back to its original name

Updated `package.json` scripts:
- `electron:build` → `node build-electron.js`
- `electron:pack` → `node build-electron.js --dir`

### Why This Works
- **Dev mode:** API route exists and works normally
- **Production Electron app:** Doesn't use the Next.js API route at all - the `electron/main.js` file has its own `handleApiRequest()` function (line 266) that serves the expression maps directly
- **Build time:** API route is temporarily hidden so Next.js can create the static export

### Files Modified
- `build-electron.js` (new) - Custom build script with API route handling
- `package.json` - Updated electron:build and electron:pack scripts
- `next.config.js` - Reverted to original simple config (no changes needed)

### Testing
Build now completes successfully:
```
npm run electron:build
```

Output: `dist\Cubby Remote Setup 1.1.0.exe`

### Notes
- No changes to application code were needed
- The API route file stays in the codebase for dev mode
- Production app functionality unchanged (still uses Electron's API handler)
- If you get "EPERM" errors during build, close `route.ts` in your IDE first

---

## 2026-01-18: Cleaned Up Expression Maps from Repository

### Problem
The `expression-maps/` folder contained 88 committed expression map files (Vienna Symphonic Prime, Synchron Strings, Cremona Quartet, Met Ark) totaling ~97KB. These were personal library files that should not be in the repository.

### Why This Happened
The folder was created during development for testing and the files were accidentally committed. The folder should only exist locally for each user with their own expression maps.

### Solution
1. Removed all 88 expression map files from git tracking (`git rm -r expression-maps/`)
2. Added `expression-maps/` to `.gitignore` to prevent future commits
3. Updated README.md to clarify:
   - The folder is auto-created by the app when first run
   - Users add their own `.expressionmap` files locally
   - Not included in the repository

### Why This Is Better
- **Cleaner repository:** Removed 97,045 lines of XML files
- **User privacy:** Personal expression map libraries stay local
- **Flexibility:** Each user has their own expression maps without conflicts
- **Auto-creation:** Code in `src/app/api/expression-maps/route.ts` (line 36) and `electron/main.js` (line 22) creates the folder when needed

### Files Modified
- `.gitignore` - Added `expression-maps/` exclusion
- `README.md` - Added note about auto-created folder
- Removed 88 `.expressionmap` files from git tracking

### For Users
**Development mode:**
- Run the app - `expression-maps/` folder is created automatically
- Add your `.expressionmap` files there
- Organize in subfolders if desired (e.g., `Strings/`, `Brass/`)

**Standalone app:**
- Use system tray menu: "Add Expression Maps..." or "Open Expression Maps Folder"
- Location: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\resources\expression-maps\`

---

## 2026-01-24: Cubby Loader / Template Builder Development (In Progress)

### Goal
Build a tool that automates creating Cubase templates with:
1. Tracks named after expression maps
2. Expression maps assigned to tracks
3. Kontakt instruments loaded (future phase)

### Problem Being Solved
For large orchestral templates (hundreds/1000+ tracks), manually:
- Adding Kontakt instances to each track
- Loading instruments into Kontakt
- Assigning expression maps to tracks

...is extremely tedious and time-consuming.

### Approach: 3-Phase Workflow

**Phase 1 (EXISTS - Template Builder):**
- User selects expression maps from `/expression-maps/` folder
- Generates DAWproject with tracks named after selected expression maps
- User imports DAWproject into Cubase → gets empty tracks with correct names
- User saves as .cpr

**Phase 2 (IN PROGRESS):**
- User feeds .cpr back into Template Builder
- Tool matches track names to expression maps in the folder
- Tool assigns expression maps to tracks
- Outputs modified .cpr with expression maps assigned

**Phase 3 (FUTURE):**
- Add Kontakt instrument loading

### Technical Findings

#### .cpr File Structure
- Cubase .cpr files are RIFF-based binary format ("RIF2" header)
- Expression map assignments stored with pattern: `"All MIDI Inputs" ... "All MIDI Inputs" ... [length byte] [exp map name] [null] [BOM]`
- Expression map data is EMBEDDED in .cpr (not just referenced by name)
- PInstrumentMap sections contain the actual expression map data

#### Expression Map Assignment Structure
Found at 4 locations in 4-track base template:
- 0x4f9318: "NICRQ Stradivari Violin Multi Mic Attribute"
- 0xa224cf: "NICRQ Guarneri Violin Multi Mic Attribute"
- 0xefa8ae: "NICRQ Amati Viola Multi Mic Attribute"
- 0x143e059: "NICRQ Stradivari Cello Multi Mic Attribute"

Length byte format: `name length + 4` (accounts for null + BOM EF BB BF)

### Tools Created

1. **`cpr-expression-map-tool.js`** - Finds and replaces expression map assignments in .cpr files
2. **`phase2-assign-expression-maps.js`** - Matches expression maps from folder to .cpr assignments
3. **`generate-template.js`** - Generates .cpr from base template with renamed tracks/expression maps
4. **`analyze-template.js`** - Analyzes .cpr files to find track names and expression maps

### Key Discovery: Binary Modification Limitations

**The Problem:** Cubase .cpr files use RIFF binary format with strict size requirements:
- Changing string lengths (track names, expression map names) breaks nested chunk sizes
- Expression map DATA is embedded in .cpr files (PInstrumentMap sections), not just referenced by name
- Simply replacing names with padding doesn't work - Cubase uses the embedded articulation data

**Attempted Solutions That Failed:**
1. **Name replacement with padding** - Names changed but articulations were still from placeholder
2. **Binary splice** - Extracting PInstrumentMap sections and splicing into target broke RIFF structure
3. **RIFF header fix** - Updating main RIF2 size field wasn't enough; nested chunk sizes also broken

**Research Findings:**
- Cubase Project Logical Editor cannot assign expression maps (confirmed by Steinberg)
- MIDI Remote API has no documented support for expression map assignment
- No native batch assignment feature exists in Cubase

### Final Solution: Track ↔ Expression Map Mapping Tool

Instead of modifying .cpr files (risky), we created a tool that enables auto-switching by **copying expression map files with track-matching names**.

**Tool:** `rename-tracks-to-expmaps.js`

**How it works:**
1. Analyzes .cpr template to find track names and their expression map assignments
2. Matches tracks to expression maps by name similarity
3. Copies expression map files with new names matching track names
4. Auto-switching now works: track "Stradivari Violin" → loads "Stradivari Violin.expressionmap"

**Usage:**
```bash
# Analyze template
node rename-tracks-to-expmaps.js template.cpr

# Copy expression maps with track-matching names
node rename-tracks-to-expmaps.js template.cpr --copy-maps ~/ExpressionMaps ./expression-maps
```

**Features:**
- Finds track names (Name fields followed by "Bus UID" marker)
- Finds expression map assignments ("All MIDI Inputs" pattern)
- Detects mismatches (e.g., track "Amati Violin" with "Amati Viola" expression map)
- Searches subdirectories when copying files
- Shows both matched and unmatched items

### Workflow for Large Templates

1. **Create template in Cubase** with tracks and expression maps assigned
2. **Run mapping tool** to analyze track → expression map relationships
3. **Copy expression maps** with track-matching names using `--copy-maps`
4. **Auto-switching works** - Cubby Remote loads correct expression map when track selected

### Files
- `rename-tracks-to-expmaps.js` - Final working mapping/copy tool (CLI + module)
- `base-template-4tracks.cpr` - Test template with 4 tracks + Kontakt + expression maps

---

## 2026-01-25: Template Analyzer Added to Tray Menu

### Feature
Added "Analyze Template (.cpr)..." menu item to the system tray, providing GUI access to the track/expression map mapping tool.

### How It Works
1. User clicks tray icon → "Analyze Template (.cpr)..."
2. File dialog opens to select a Cubase .cpr file
3. Tool analyzes the template and shows:
   - Track names found
   - Expression map assignments
   - Matched track → expression map pairs
   - Unmatched items (potential mismatches)
4. User can click "Copy Expression Maps" to:
   - Select source folder containing expression maps
   - Tool copies files to app's expression-maps folder
   - Files renamed to match track names (enables auto-switching)

### Implementation
- Refactored `rename-tracks-to-expmaps.js` to export functions for module use
- Added `analyzeCprFile()` and `copyExpressionMaps()` as reusable functions
- CLI functionality preserved (`node rename-tracks-to-expmaps.js template.cpr`)
- Added menu item and handlers in `electron/main.js`
- Added script to `asarUnpack` in `electron-builder.yml` for production builds

### Files Modified
- `rename-tracks-to-expmaps.js` - Added module exports, refactored for dual CLI/module use
- `electron/main.js` - Added `handleAnalyzeTemplate()` and `handleCopyExpressionMaps()` functions
- `electron-builder.yml` - Added `rename-tracks-to-expmaps.js` to unpacked files

### User Benefit
Users with existing large templates can now:
1. Analyze their template to see track/expression map relationships
2. Automatically copy expression maps with track-matching names
3. Enable auto-switching without manually renaming files

This bridges the gap for users who already have templates with expression maps assigned but where track names don't match expression map file names.

---

## 2026-01-25: Template Builder Frontend Improvements

### Problem
The Template Builder frontend had several UX and functional issues:
1. **Hard-coded detection** - Only worked with "Cremona Quartet" instruments
2. **Manual selection UI** - Showed dropdown selectors to manually assign expression maps (backwards workflow)
3. **Blocking processing** - Renaming blocked the UI, causing "Page Unresponsive" browser warnings
4. **Limited track detection** - Only found tracks with "Bus UID" marker (missed ~130 tracks in a 228-track template)
5. **Confusing workflow** - Download button triggered renaming AND download in one step

### Solution

**1. Generic .cpr Analysis**
- Removed hard-coded `KNOWN_SLOT_CONFIGS` that only worked with Cremona Quartet
- Ported analysis functions from `rename-tracks-to-expmaps.js` to frontend:
  - `findTrackNames()` - Finds ALL tracks (not just main instrument tracks)
  - `findExpressionMapAssignments()` - Finds ALL expression map assignments
  - Proximity-based matching - Prioritizes tracks near the expression map in the file

**2. Improved Track Detection**
- **Removed "Bus UID" requirement** - Now finds MIDI tracks, instrument tracks, group tracks, FX tracks
- **Proximity scoring** - Tracks within 100KB of expression map get 100 points, within 500KB get 50 points
- **Name similarity scoring** - Expression map name containing track name gets 10× score multiplier
- Result: Detects many more tracks (98 → 228 in test template)

**3. Automatic Track Renaming**
- Automatically extracts clean track names from expression maps
- Removes common suffixes: "Multi Mic Attribute", "Attribute"
- Removes vendor prefixes: "NICRQ", "VSL"
- Example: "NICRQ Stradivari Violin Multi Mic Attribute" → "Stradivari Violin"

**4. Non-Blocking UI with Progress Feedback**
- Separated renaming logic from download logic
- Added progress bar showing "Renaming: Track Name" with live count
- `await setTimeout(0)` after each track to yield to browser (prevents "Page Unresponsive")
- Green success state when complete: "✓ Renaming Complete! X tracks renamed"

**5. Two-Step Workflow**
- **Step 1**: Click "🎹 Start Renaming" → Shows progress bar → Completes with success message
- **Step 2**: Click "💾 Download Renamed Template" → Instant download (no processing)
- Optional "Start Over" button to load a new template

**6. User Guide Integration**
- Added Template Builder section to website setup guide (`cubby-remote-website/app/setup/page.tsx`)
- Added "User Guide" button (? icon) in main app header
- Links to `https://cubby-remote.com/setup` with full documentation

### Files Modified
- `src/app/template-builder/page.tsx` - Complete rewrite of analysis and UI logic
- `src/app/page.tsx` - Added User Guide button
- `public/sw.js` - Updated cache version (v9 → v10)
- `../cubby-remote-website/app/setup/page.tsx` - Added Template Builder documentation

### Technical Details
- **Track detection**: Searches for `Name\x00\x00\x08[len][name]` pattern in binary .cpr file
- **Expression map detection**: Looks for paired "All MIDI Inputs" markers with expression map names
- **Proximity algorithm**: Uses file position to match tracks to nearby expression maps
- **Progress tracking**: React state with async setTimeout yields for UI responsiveness

### User Benefit
Users can now:
1. **Use ANY Cubase template** (not just Cremona Quartet)
2. **Rename ALL tracks** with expression maps (even without instruments loaded)
3. **See progress** in real-time without browser freezing
4. **Clear workflow** - separate renaming from downloading
5. **Access documentation** directly from the app

### Testing
Tested with 228-track template containing Vienna Symphonic Library expression maps:
- Successfully detected and renamed 228 tracks
- Process completed without "Page Unresponsive" warnings
- Progress bar updated smoothly showing each track
- Download triggered only when user clicked download button

---

## Reference Docs
- `/Users/willardjansen/dev/cubby-remote/update docs/kontakt-loader-spec.md`
- `/Users/willardjansen/dev/cubby-remote/update docs/nkm-script-analysis.md`
- `/Users/willardjansen/dev/cubby-remote/update docs/cubase-integration-guide.md`
