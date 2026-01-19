# Project Signature

> A quick-reference identity card for the project

---

## Cubby Remote

| | |
|---|---|
| **One-Liner** | iPad remote control for Cubase articulation switching via WebSocket MIDI bridge |
| **Type** | Cross-platform desktop + web app |
| **Stack** | Next.js 14 · TypeScript · Tailwind · Electron · WebSocket |
| **Platforms** | Windows, macOS, iPad (web) |
| **Ports** | 3000 (web), 3001 (MIDI bridge) |
| **Entry Point** | `npm run all` or Electron app |

---

## Architecture At-a-Glance

```
iPad/Browser ──WebSocket──▶ midi-server.js ──MIDI──▶ Cubase
                                ◀──MIDI── (track names)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main UI, track switching logic |
| `src/lib/midiHandler.ts` | MIDI + WebSocket communication |
| `src/lib/expressionMapParser.ts` | Parse .expressionmap XML |
| `midi-server.js` | WebSocket ↔ MIDI bridge |
| `electron/main.js` | Desktop app wrapper |
| `cubase-midi-remote/articulation_remote.js` | Cubase script |

## Commands

```bash
npm run all           # Dev: web + MIDI server
npm run electron:dev  # Dev: Electron app
npm run electron:build # Build installer
```

## Dependencies (Critical)

- `jzz` - MIDI output to Cubase
- `midi` - MIDI input from Cubase
- `ws` - WebSocket server
- `electron` - Desktop wrapper

## External Requirements

- **Windows**: loopMIDI (virtual MIDI)
- **macOS**: IAC Driver (built-in)
- **Cubase**: MIDI Remote script installed

---

*Quick reference - see DESIGN_SPECIFICATION.md for full details*
