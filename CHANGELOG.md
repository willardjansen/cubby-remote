# Changelog

All notable changes to Cubby Remote will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-01-29

### Changed
- **Port numbers updated** - Changed from 3000/3001 to 7100/7101 to avoid conflict with macOS AirPlay Receiver (port 7000)
  - Web UI: `http://localhost:7100`
  - WebSocket MIDI bridge: `ws://localhost:7101`

---

## [1.1.0] - 2026-01-17

### Added
- **Template Builder Button** - Quick access icon in the main app header (top-right corner) for easy access to the DAWproject Template Builder
- **MIDI Server Log Viewer** - New system tray menu item "View MIDI Server Log" for troubleshooting production issues
- **DAWproject Template Builder Web UI** - Interactive web interface at `/template-builder` for generating Cubase project templates
- **Template Builder CLI** - Command-line script `generate-dawproject.js` for automated template generation
- Comprehensive macOS build instructions in README.md
- Enhanced documentation with naming convention examples and troubleshooting guides

### Fixed
- **Critical: Missing native module dependencies** - Added `bindings` and `file-uri-to-path` packages to electron-builder asarUnpack configuration, fixing WebSocket connection failures in installed app
- **Template Builder routing** - Static file server now correctly handles directory-style routes (e.g., `/template-builder`)
- **TypeScript build error** - Fixed type inference issue in `src/app/page.tsx` by adding explicit type annotation for `mapNumbers`
- **Node.js path detection** - Added robust Node.js executable discovery for Windows systems where Node.js isn't in PATH
- MIDI server now runs as separate Node.js process, eliminating native module version conflicts with Electron

### Changed
- MIDI server architecture: Now spawned as child process instead of embedded in Electron, using system Node.js v21.6.2
- Electron builder configuration: Disabled `npmRebuild` to prevent native module conflicts
- Enhanced MIDI server logging with timestamps and persistent log file storage
- Improved static file server with fallback routing for Next.js static export

### Technical Details
- **Issue**: `midi.node` was compiled for Node.js v21.6.2 (module version 120) but Electron uses a different internal Node.js version (module version 119)
- **Solution**: MIDI server (`midi-server.js`) now runs as a separate Node.js process, using the system-installed Node.js v21.6.2 where the native module works correctly
- **Benefit**: Eliminates electron-rebuild requirements and provides cleaner separation of concerns

### Documentation
- Updated README.md with v1.1.0 features and macOS build instructions
- Added PROGRESS.md with complete development session history
- Added PICKUP.md for quick project status reference
- Enhanced troubleshooting section with MIDI Server Log instructions

## [1.0.0] - 2026-01-16

### Added
- Initial release of Cubby Remote standalone Electron application
- System tray application with built-in MIDI server
- Auto track switching via Cubase MIDI Remote script
- WebSocket MIDI bridge for iPad support
- Expression map parser and articulation button grid
- Server-side expression map loading
- Multi-map merging with automatic MIDI channel assignment
- Search and filter functionality for articulations
- Instrument library save/load feature
- PWA support for iPad installation
- Windows installer with NSIS
- loopMIDI integration for Windows
- IAC Driver support for macOS

### Features
- **iPad Optimized Interface** - Touch-friendly articulation buttons
- **Auto Track Switching** - Automatically loads matching expression map when selecting tracks in Cubase
- **Server-Side Maps** - Store `.expressionmap` files on computer, auto-load on track change
- **Multi-File Support** - Drag and drop multiple expression maps, auto-merge into unified view
- **MIDI Channels** - Merged maps automatically send on correct MIDI channels (Ch1-4)
- **Auto-Assign Remotes** - Missing trigger notes automatically assigned starting from C-2
- **Cubase Color Matching** - Buttons match Cubase expression map color coding
- **WebSocket Fallback** - Works on iPad via WebSocket bridge when Web MIDI API unavailable

### Technical Implementation
- Next.js 14 with App Router
- TypeScript throughout
- Tailwind CSS with custom Cubase-themed colors
- Electron system tray application
- Node.js MIDI bridge server using `jzz`, `midi`, and `ws` libraries
- Web MIDI API with WebSocket fallback
- Cubase MIDI Remote API integration
- Expression map XML parsing

### Platform Support
- Windows 10/11 with loopMIDI
- macOS with IAC Driver
- iPad via WebSocket bridge
- Chrome/Edge browsers with Web MIDI API

---

## Version History Summary

- **v1.1.0** (2026-01-17) - Template Builder, MIDI Log Viewer, production fixes
- **v1.0.0** (2026-01-16) - Initial standalone Electron app release

---

**Project Repository**: https://github.com/willardjansen/cubby-remote
**License**: GNU General Public License v3.0
**Author**: Willard Jansen
