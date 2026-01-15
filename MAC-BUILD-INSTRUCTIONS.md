# Mac Build Instructions

**Purpose:** Build and upload the macOS .dmg installer for Cubby Remote v1.0.0

**Current Status:**
- ✅ Windows installer built and uploaded to GitHub Release v1.0.0
- ⏳ Mac installer needs to be built and uploaded

---

## Prerequisites

- Running on macOS computer
- Node.js 18+ installed
- Git installed
- GitHub CLI (`gh`) installed: `brew install gh`
- Xcode Command Line Tools: `xcode-select --install`

---

## Step 1: Pull Latest Code

```bash
cd ~/path/to/cubase-articulation-remote-mac
git pull origin master
```

Verify you have the latest changes:
- package.json has author info (Willard Jansen)
- electron-builder.yml exists and is configured
- Documentation is updated for Electron app

---

## Step 2: Install Dependencies

```bash
npm install
```

This will:
- Install all Node.js dependencies
- Run `electron-builder install-app-deps` (postinstall script)
- Rebuild native modules for macOS

---

## Step 3: Build Mac Installer

```bash
npm run electron:build
```

**What happens:**
1. Next.js builds production web app (`npm run build`)
2. Electron-builder packages the app
3. Creates macOS .dmg installer
4. May prompt for code signing (can skip for now)

**Expected output:**
- `dist/Cubby Remote-1.0.0.dmg` (~150-200 MB)

**Build time:** 3-5 minutes

---

## Step 4: Verify the Build

Check that the .dmg was created:

```bash
ls -lh dist/*.dmg
```

You should see:
```
Cubby Remote-1.0.0.dmg
```

Optional - Test the installer:
```bash
open "dist/Cubby Remote-1.0.0.dmg"
```

---

## Step 5: Authenticate with GitHub

If not already authenticated:

```bash
gh auth login
```

Follow the prompts to authenticate.

---

## Step 6: Upload to GitHub Release

Upload the Mac installer to the existing v1.0.0 release:

```bash
gh release upload v1.0.0 "dist/Cubby Remote-1.0.0.dmg"
```

**Expected output:**
```
✓ Uploaded dist/Cubby Remote-1.0.0.dmg to v1.0.0
```

---

## Step 7: Verify on GitHub

Open the release page:
```bash
gh release view v1.0.0 --web
```

Or visit: https://github.com/willardjansen/cubase-articulation-remote-mac/releases/tag/v1.0.0

**Check that both installers are present:**
- ✅ Cubby Remote Setup 1.0.0.exe (Windows)
- ✅ Cubby Remote-1.0.0.dmg (macOS)

---

## Step 8: Commit and Push (if needed)

If the build process modified any files:

```bash
git status
git add .
git commit -m "Build macOS installer for v1.0.0

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

---

## Troubleshooting

### "electron-builder not found"
```bash
npm install
```

### Build fails with code signing error
Add to `electron-builder.yml`:
```yaml
mac:
  identity: null
```
Then rebuild.

### .dmg not created
Check the output for errors. Common issues:
- Insufficient disk space (need ~2GB free)
- Missing Xcode Command Line Tools
- Node version mismatch (need 18+)

### Upload fails
Check GitHub authentication:
```bash
gh auth status
```

Re-authenticate if needed:
```bash
gh auth login
```

---

## Project Structure

Key files for Electron build:
- `electron/main.js` - Main Electron process
- `electron-builder.yml` - Build configuration
- `build/icon.icns` - macOS icon
- `build/entitlements.mac.plist` - macOS entitlements

---

## After Upload Complete

1. ✅ Both Windows and Mac installers are available
2. ✅ Release v1.0.0 is complete
3. Update README.md to change "macOS: Coming soon" to link the release
4. Announce the release!

---

## Notes

- The Mac build **cannot** be done from Windows (requires macOS-specific tools)
- The Windows build **can** be done from Mac (via cross-compilation)
- Both builds are in the same `dist/` folder but must be built on their respective platforms
- The dist folder is gitignored, so builds don't sync between machines

---

**Target Release:** https://github.com/willardjansen/cubase-articulation-remote-mac/releases/tag/v1.0.0

**Status after completion:** 🎉 v1.0.0 fully released with both Windows and macOS installers!
