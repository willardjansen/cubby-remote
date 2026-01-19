# Design Specification & Project Signature

> **Project:** Cubby Remote (Cubase Articulation Remote)
> **Version:** 1.0.0
> **Date:** January 2026
> **Author:** [Your Name]

---

## Table of Contents

1. [Project Signature](#project-signature)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Architecture](#architecture)
5. [Technology Decisions](#technology-decisions)
6. [Data Flow](#data-flow)
7. [Component Specifications](#component-specifications)
8. [API Contracts](#api-contracts)
9. [Security Considerations](#security-considerations)
10. [Performance Considerations](#performance-considerations)
11. [Deployment](#deployment)
12. [Future Considerations](#future-considerations)
13. [Lessons Learned](#lessons-learned)

---

## Project Signature

| Attribute | Value |
|-----------|-------|
| **Name** | Cubby Remote |
| **Type** | Cross-platform desktop + web application |
| **Primary Language** | TypeScript |
| **Framework** | Next.js 14 (App Router) + Electron |
| **Target Platforms** | Windows, macOS, iPad (web) |
| **Architecture Style** | Client-server with WebSocket bridge |
| **Primary Protocol** | MIDI over WebSocket |
| **LOC (approx)** | ~3,500 |
| **Dependencies** | 15 production, 10 dev |
| **Build Output** | Static web app + Electron installer |

### One-Liner
> A web-based remote control for Cubase expression maps that enables iPad articulation switching via WebSocket MIDI bridge.

### Elevator Pitch
> Cubby Remote transforms your iPad into a touch-friendly control surface for Cubase articulation switching. Tap buttons to trigger articulations, and watch the interface automatically update when you switch tracks in Cubase. Works locally or over your network.

---

## Problem Statement

### The Problem
Composers using Cubase with virtual instruments need to frequently switch articulations (playing styles like legato, staccato, tremolo). The current workflow involves:
1. Mouse-clicking tiny UI elements in Cubase
2. Using keyboard shortcuts (limited number)
3. Buying expensive dedicated hardware controllers

None of these solutions are touch-friendly or leverage devices users already own (tablets).

### User Needs
- Quick, touch-friendly articulation switching
- Works with existing iPad/tablet hardware
- No latency-sensitive audio (MIDI control only)
- Automatic context switching when changing tracks
- Works across local network (Cubase on desktop, control from tablet)

### Constraints
- iPad Safari doesn't support Web MIDI API
- Cubase requires specific MIDI port setup to avoid feedback loops
- Expression maps are XML files with undocumented structure
- Must work on both Windows and macOS

---

## Solution Overview

### High-Level Approach
Build a web application that:
1. Parses Cubase expression map files
2. Displays articulations as tappable buttons
3. Sends MIDI commands via WebSocket to a bridge server
4. Bridge server relays MIDI to Cubase
5. Cubase sends track name changes back through the bridge
6. Web app auto-loads matching expression maps

### Key Innovation
**Bidirectional MIDI bridge** - Most solutions only go one direction. We created a two-way communication channel where Cubase can push track changes to the web app.

---

## Architecture

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Host Computer (Win/Mac)                      │
│                                                                  │
│  ┌──────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│  │   Next.js    │◀─▶│   MIDI Bridge   │◀─▶│     Cubase      │  │
│  │   Web App    │   │     Server      │   │                 │  │
│  │   :3000      │   │     :3001       │   │                 │  │
│  └──────────────┘   └─────────────────┘   └─────────────────┘  │
│         ▲                   ▲                      ▲            │
│         │                   │                      │            │
│         │ HTTP/WS           │ WebSocket            │ MIDI       │
│         │                   │                      │            │
└─────────│───────────────────│──────────────────────│────────────┘
          │                   │                      │
          │                   │              Virtual MIDI Driver
          │                   │              (loopMIDI / IAC)
          │                   │
     ┌────┴───────────────────┴───────┐
     │         iPad / Tablet           │
     │      Safari/Chrome Browser      │
     └─────────────────────────────────┘
```

### Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cubby Remote                              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Next.js Application                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │  │
│  │  │    Pages    │  │ Components  │  │    Libraries     │  │  │
│  │  │  ─────────  │  │  ─────────  │  │  ─────────────   │  │  │
│  │  │  page.tsx   │  │ Articulation│  │  midiHandler.ts  │  │  │
│  │  │  layout.tsx │  │ Button/Grid │  │  expressionMap   │  │  │
│  │  │  API routes │  │ FileDropZone│  │  Parser.ts       │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────┐  ┌────────────────────────────────────┐  │
│  │   MIDI Server     │  │        Electron Shell              │  │
│  │   ───────────     │  │        ─────────────               │  │
│  │   midi-server.js  │  │   System tray, server management   │  │
│  │   WebSocket + jzz │  │   Static file server, auto-launch  │  │
│  └───────────────────┘  └────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Cubase MIDI Remote Script                  │  │
│  │                 ─────────────────────────                  │  │
│  │   articulation_remote.js - Track name broadcaster          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Web App** | UI, file parsing, MIDI send/receive | Next.js, React, TypeScript |
| **MIDI Server** | WebSocket↔MIDI translation | Node.js, jzz, midi, ws |
| **Electron Shell** | Desktop wrapper, tray, server lifecycle | Electron |
| **Cubase Script** | Track selection monitoring, name broadcast | Cubase MIDI Remote API |

---

## Technology Decisions

### Decision Record Template

#### DR-001: Next.js over Create React App

**Context:** Need a React-based frontend that can be deployed as static files.

**Decision:** Use Next.js 14 with App Router.

**Rationale:**
- Built-in static export (`output: 'export'`)
- API routes for server-side expression map listing
- Modern React features (Server Components, Suspense)
- Strong TypeScript support
- Future path to server-side features if needed

**Consequences:**
- (+) Clean project structure
- (+) Easy static export for Electron
- (-) Larger bundle than minimal React

---

#### DR-002: WebSocket for iPad MIDI

**Context:** iPad Safari doesn't support Web MIDI API.

**Decision:** Create WebSocket bridge server that accepts MIDI commands as JSON and forwards to native MIDI.

**Rationale:**
- WebSocket universally supported
- Low latency for MIDI commands
- Can be bidirectional (enable track name sync)
- Simple JSON protocol

**Alternatives Considered:**
- HTTP polling (too slow)
- Native app (requires App Store, maintenance)
- Bluetooth MIDI (complex, pairing issues)

**Consequences:**
- (+) Works on any browser
- (+) Enables bidirectional communication
- (-) Requires server running on host machine
- (-) Additional network hop

---

#### DR-003: Electron for Desktop App

**Context:** Users want single-click install without running terminals.

**Decision:** Wrap web app in Electron with embedded MIDI server.

**Rationale:**
- Can bundle Node.js MIDI server
- System tray for background operation
- Familiar install experience (exe/dmg)
- Access to native file system

**Consequences:**
- (+) One installer, no dependencies
- (+) System tray integration
- (-) Large install size (~130MB)
- (-) Native module complexity

---

#### DR-004: jzz + midi Package Combination

**Context:** Need to send MIDI out and receive MIDI in on different ports.

**Decision:** Use `jzz` for output (to Cubase) and `midi` for input (from Cubase).

**Rationale:**
- `jzz` has excellent cross-platform output support
- `midi` package provides reliable input callbacks
- Using both avoids port conflicts

**Consequences:**
- (+) Reliable bidirectional MIDI
- (-) Two dependencies for MIDI
- (-) Different APIs to learn

---

#### DR-005: Custom Track Name Protocol

**Context:** Need to send track names from Cubase to web app.

**Decision:** Encode track name as CC messages on MIDI channel 16.

**Protocol:**
```
CC 119: Start marker + name length
CC 118: Character bytes (repeated, 7-bit masked)
CC 117: End marker (value 127)
```

**Rationale:**
- CC messages are reliable (not filtered by Cubase)
- Channel 16 unlikely to conflict with instruments
- 7-bit encoding fits MIDI spec
- Simple to implement both ends

**Consequences:**
- (+) Works within MIDI constraints
- (+) No external dependencies
- (-) Limited to ASCII characters
- (-) Names truncated at 127 chars

---

### Technology Stack Summary

| Layer | Choice | Why |
|-------|--------|-----|
| **UI Framework** | React 18 | Component model, hooks, ecosystem |
| **Meta-Framework** | Next.js 14 | Static export, API routes, DX |
| **Language** | TypeScript | Type safety, IDE support |
| **Styling** | Tailwind CSS | Rapid UI development, consistent design |
| **MIDI Output** | jzz | Cross-platform, pure JS fallback |
| **MIDI Input** | midi (npm) | Native bindings, reliable callbacks |
| **WebSocket** | ws | Simple, performant, well-maintained |
| **Desktop** | Electron | Native features, bundling |
| **Build** | electron-builder | Cross-platform installers |

---

## Data Flow

### Flow 1: Articulation Trigger (User → Cubase)

```
1. User taps ArticulationButton
2. Component calls midiHandler.sendMessages([{status, data1, data2}])
3. midiHandler checks connection type:
   a. Web MIDI: Send directly to selected output
   b. WebSocket: Send JSON to ws://host:3001
4. midi-server.js receives WebSocket message
5. Server sends MIDI via jzz to "Browser to Cubase" port
6. Cubase receives on input, triggers articulation
```

**Latency:** ~5-15ms (WebSocket) | ~1-5ms (Web MIDI direct)

### Flow 2: Track Change (Cubase → User)

```
1. User selects different track in Cubase
2. MIDI Remote script's mOnTitleChange fires
3. Script encodes track name as CC sequence
4. Sends to "ArticulationRemote" MIDI port
5. midi-server.js receives via midi package callback
6. Server broadcasts JSON to all WebSocket clients
7. midiHandler fires trackNameListeners
8. page.tsx searches server maps for matching name
9. Loads and displays matching expression map
```

**Latency:** ~50-100ms (acceptable for UI update)

### Data Structures

#### Expression Map (Parsed)
```typescript
interface ExpressionMap {
  name: string;
  slots: ArticulationSlot[];
}

interface ArticulationSlot {
  name: string;
  description?: string;
  color?: number;
  group?: string;
  remoteTrigger?: {
    status: number;  // MIDI status byte
    data1: number;   // Note number
  };
  midiMessages: MidiMessage[];
  midiChannel: number;
}
```

#### WebSocket Protocol
```typescript
// Browser → Server
{ type: 'midi', status: number, data1: number, data2: number }

// Server → Browser
{ type: 'trackName', name: string }
{ type: 'midiStatus', connected: boolean, input: string, output: string }
```

---

## Component Specifications

### midiHandler.ts

**Purpose:** Singleton managing all MIDI communication.

**Public Interface:**
```typescript
class MidiHandler {
  // Connection
  async initialize(): Promise<void>
  isConnected(): boolean

  // Device selection
  getInputs(): MIDIInput[]
  getOutputs(): MIDIOutput[]
  selectInput(id: string): void
  selectOutput(id: string): void

  // Messaging
  sendMessages(messages: MidiMessage[]): void

  // Track name callbacks
  onTrackName(callback: (name: string) => void): () => void
}
```

**State:**
- `selectedInput: MIDIInput | null`
- `selectedOutput: MIDIOutput | null`
- `useWebSocket: boolean`
- `webSocket: WebSocket | null`
- `trackNameListeners: Set<Function>`

### expressionMapParser.ts

**Purpose:** Parse Cubase XML expression maps.

**Public Interface:**
```typescript
function parseExpressionMap(xmlString: string): ExpressionMap
function autoAssignRemoteTriggers(map: ExpressionMap): ExpressionMap
function mergeExpressionMaps(maps: ExpressionMap[]): ExpressionMap
```

**Key Algorithm:** Remote trigger auto-assignment
```
1. Find highest existing remote trigger note
2. Start from C-2 (note 0) if none exist
3. For each slot without remote trigger:
   - Assign next available note
   - Increment counter
4. Return modified map
```

---

## API Contracts

### GET /api/expression-maps

**Purpose:** List available expression maps on server.

**Response:**
```typescript
{
  maps: Array<{
    name: string;      // Filename without extension
    filename: string;  // Full filename
  }>
}
```

### GET /api/expression-maps?file={filename}

**Purpose:** Retrieve expression map file content.

**Response:** Raw XML string of .expressionmap file

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **Malicious XML** | DOMParser sandboxed, no script execution |
| **Network exposure** | Server binds to local IP only |
| **WebSocket hijacking** | Origin checking on connections |
| **Path traversal** | Filename validation in API route |
| **Code injection** | No eval, parameterized queries |

### Network Security
- MIDI server only binds to local network IP
- No authentication (trusted local network assumption)
- Consider adding auth for production deployments

---

## Performance Considerations

### Targets
- MIDI latency: <20ms
- UI responsiveness: <100ms
- Expression map parse: <500ms

### Optimizations Implemented
1. **Single WebSocket connection** - Reused for all commands
2. **Debounced track name updates** - Prevent rapid reloads
3. **Memoized articulation list** - Avoid re-renders
4. **Static export** - No SSR overhead

### Metrics to Monitor
- WebSocket message roundtrip time
- Expression map parse time
- UI interaction lag (touch to visual)

---

## Deployment

### Development
```bash
npm install
npm run all  # Starts Next.js + MIDI server
```

### Production (Electron)
```bash
npm run build           # Build Next.js static
npm run electron:build  # Create installer
```

### Distribution
- Windows: NSIS installer (.exe)
- macOS: DMG with code signing
- Linux: AppImage (untested)

### User Requirements
- Windows: loopMIDI virtual MIDI driver
- macOS: IAC Driver (built-in)
- Cubase: MIDI Remote script installation

---

## Future Considerations

### Potential Enhancements
1. **Cloud sync** - Sync expression maps across devices
2. **Multi-user** - Multiple iPads controlling same Cubase
3. **Visual editor** - Create/edit expression maps in browser
4. **MIDI learn** - Auto-detect articulation mappings
5. **Velocity curves** - Adjustable touch sensitivity

### Technical Debt
1. Error handling could be more robust
2. Unit test coverage is minimal
3. WebSocket reconnection logic is basic
4. Electron build size could be reduced

### Migration Paths
- If Next.js deprecated: Vite + React Router
- If Electron deprecated: Tauri (Rust)
- If jzz deprecated: Web MIDI polyfill or native module

---

## Lessons Learned

### What Worked Well
1. **WebSocket for iPad** - Elegant solution to missing Web MIDI
2. **Cubase MIDI Remote API** - More capable than expected
3. **Tailwind CSS** - Rapid UI iteration
4. **Static export** - Simplified Electron integration

### What Was Challenging
1. **MIDI feedback loops** - Required specific Cubase configuration
2. **Native modules in Electron** - Packaging complexity
3. **Cubase script debugging** - Limited tooling
4. **Cross-platform MIDI** - Different drivers, different behaviors

### Recommendations for Similar Projects
1. **Prototype the hardest part first** - MIDI bridge was critical path
2. **Test on target devices early** - iPad quirks discovered late
3. **Document Cubase setup thoroughly** - User config is complex
4. **Use virtual MIDI for testing** - Don't require Cubase running

---

## Appendix A: File Structure

```
cubby-remote/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main app (track switching logic)
│   │   ├── layout.tsx            # Root layout (PWA meta)
│   │   └── api/expression-maps/  # Server map API
│   ├── components/
│   │   ├── ArticulationButton.tsx
│   │   ├── ArticulationGrid.tsx
│   │   ├── FileDropZone.tsx
│   │   ├── InstrumentLibrary.tsx
│   │   └── MidiSettings.tsx
│   └── lib/
│       ├── expressionMapParser.ts
│       └── midiHandler.ts
├── electron/
│   └── main.js                   # Electron main process
├── cubase-midi-remote/
│   └── articulation_remote.js    # Cubase script
├── midi-server.js                # WebSocket MIDI bridge
├── expression-maps/              # Server-side maps
└── [config files]
```

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Articulation** | A playing technique (legato, staccato, etc.) |
| **Expression Map** | Cubase feature mapping MIDI to articulations |
| **Remote Trigger** | MIDI note that activates an articulation in Cubase |
| **Keyswitch** | MIDI note sent to sampler to change sound |
| **loopMIDI** | Windows virtual MIDI cable software |
| **IAC Driver** | macOS built-in virtual MIDI driver |
| **MIDI Remote** | Cubase 12+ scripting API for control surfaces |

---

*Document generated: January 2026*
*Template version: 1.0*
