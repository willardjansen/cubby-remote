# Mac Build Instructions

## Prerequisites

1. **Install Node.js v21.6.2**
   ```bash
   # Download from:
   https://nodejs.org/dist/v21.6.2/node-v21.6.2.pkg

   # Or using Homebrew (may not get exact version):
   brew install node@21
   ```

2. **Install Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

3. **Git clone or pull latest changes**
   ```bash
   cd ~/dev  # or your preferred location
   git clone <your-repo-url> cubby-remote
   cd cubby-remote

   # OR if already cloned:
   git pull origin master
   ```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Verify the build script exists**

   The `build-electron.js` file should already be in your repo (pushed from Windows). If not, you'll need to pull it or the build will hang.

## Building

### Build Installer (DMG)

```bash
npm run electron:build
```

This will:
- Hide the API route temporarily (prevents build hanging)
- Build Next.js static export
- Create macOS installer at: `dist/Cubby Remote-1.1.0.dmg`
- Restore the API route

**Build time:** ~2-5 minutes depending on your Mac

### Build Without Installer (for testing)

```bash
npm run electron:pack
```

This creates an unpacked app at `dist/mac/Cubby Remote.app` without creating a DMG.

## Troubleshooting

### Build Hangs During Next.js Step

**Symptom:** Build stops at "Creating an optimized production build" and never completes

**Cause:** The API route file is locked or wasn't hidden properly

**Fix:**
1. Close `src/app/api/expression-maps/route.ts` in your editor
2. Make sure `build-electron.js` exists in the project root
3. Try again

### "EPERM: operation not permitted" Error

**Cause:** The route.ts file is open in your editor or being watched by a process

**Fix:**
1. Close VS Code or your editor
2. Run the build again
3. If still fails, manually rename the file:
   ```bash
   mv src/app/api/expression-maps/route.ts src/app/api/expression-maps/route.ts.dev
   npm run build
   electron-builder
   mv src/app/api/expression-maps/route.ts.dev src/app/api/expression-maps/route.ts
   ```

### Code Signing Warnings

macOS builds may show warnings about code signing. The app will still work, but macOS will show a security warning when users try to open it.

**To properly code sign (optional):**
1. Get an Apple Developer account ($99/year)
2. Create a Developer ID certificate
3. Update `electron-builder.yml` with your certificate details
4. See: https://www.electron.build/code-signing

For now, users can right-click → Open to bypass Gatekeeper.

## Output Files

After successful build, you'll find:

```
dist/
├── Cubby Remote-1.1.0.dmg          # Installer (if using electron:build)
├── Cubby Remote-1.1.0-mac.zip      # Zipped app
├── mac/
│   └── Cubby Remote.app            # The actual app (if using electron:pack)
└── builder-debug.yml               # Build metadata
```

## Testing the Build

1. **Mount the DMG:**
   ```bash
   open "dist/Cubby Remote-1.1.0.dmg"
   ```

2. **Drag to Applications** (or run from DMG)

3. **First launch:**
   - Right-click on app → Open (to bypass Gatekeeper warning)
   - Or: System Preferences → Security & Privacy → Open Anyway

4. **Verify:**
   - App appears in menu bar (system tray)
   - Click icon → "Open in Browser" should launch http://localhost:3000
   - Expression maps folder should be accessible

## Important Notes

### Why the Build Script is Needed

- Next.js with `output: 'export'` cannot build projects with API routes
- The `build-electron.js` script temporarily hides `route.ts` during build
- In production, Electron's `main.js` handles the API (not Next.js)
- Dev mode (`npm run dev`) still uses the Next.js API route normally

### Installed App Locations

- **App:** `/Applications/Cubby Remote.app`
- **Expression maps:** `~/Library/Application Support/cubby-remote/expression-maps/`
- **Logs:** `~/Library/Logs/cubby-remote/`

### Development vs Production

- **Dev mode:** `npm run dev` - Uses Next.js API routes
- **Production:** Electron app - Uses `electron/main.js` API handler (line 266)

## Pushing to Repo

After building on Mac, if you made any Mac-specific changes:

```bash
git add .
git commit -m "Mac build configuration updates"
git push origin master
```

The `build-electron.js` script works on both Windows and Mac, so no platform-specific changes should be needed.

## Common Build Commands Summary

```bash
# Install dependencies
npm install

# Development mode (Next.js + MIDI server)
npm run all

# Build installer (DMG)
npm run electron:build

# Build without installer
npm run electron:pack

# Clean build (if having issues)
rm -rf .next out dist node_modules
npm install
npm run electron:build
```

## Distribution

To distribute your Mac app:

1. Upload the DMG to your website/GitHub releases
2. Users download and mount the DMG
3. Users drag app to Applications folder
4. Users right-click → Open on first launch (Gatekeeper)

**Note:** Without code signing, users will see security warnings. Consider getting an Apple Developer account for proper distribution.
