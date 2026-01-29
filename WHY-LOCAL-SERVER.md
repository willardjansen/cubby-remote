# Why Does the App Need a Local Server for Expression Maps?

Excellent question! Let me clarify - it's not a *remote* server, it's a **local HTTP server** acting as a bridge.

Here's what's happening:

## The Problem: Browser Security

Your **web app** (running at `http://localhost:7100` in the browser) **cannot directly access files** on your computer. This is a browser security restriction - JavaScript running in a browser can't use Node.js `fs` (file system) module.

## The Solution: Local API Server

You need something to:
1. **Read** files from `C:\Users\willa\AppData\Local\...\expression-maps\`
2. **Send** them to the browser via HTTP

This is what the "server" does - it's just a local HTTP endpoint.

## Where This API Lives

### Development Mode (`npm run dev`)
- Next.js dev server runs the API route
- File: `src/app/api/expression-maps/route.ts`
- Can use Node.js `fs` module to read files
- Serves at: `http://localhost:7100/api/expression-maps`

### Production Electron App
- `electron/main.js` starts a simple HTTP server (line 153-263)
- The `handleApiRequest()` function (line 266) does the same thing
- Reads from: `...Cubby Remote\resources\expression-maps\`
- Serves at: `http://localhost:7100/api/expression-maps`

## The Flow

```
┌─────────────────────┐
│  Browser/Web App    │
│  (localhost:7100)   │
└──────────┬──────────┘
           │ HTTP GET /api/expression-maps?file=Amati Viola.expressionmap
           ↓
┌─────────────────────┐
│   Local Server      │  ← Can access file system
│  (Electron/Node.js) │
└──────────┬──────────┘
           │ fs.readFileSync()
           ↓
┌─────────────────────┐
│   File System       │
│  C:\Users\...\      │
│  expression-maps\   │
└─────────────────────┘
```

## Why the API Route Breaks Builds

- **Next.js `output: 'export'`** creates static HTML/CSS/JS files only
- **API routes require a server** to run Node.js code
- These are incompatible → build hangs

But in production, you don't need the Next.js API route because Electron's `main.js` already has its own HTTP server!

## TL;DR

The "server" is just a local HTTP endpoint that lets your browser-based UI access files from your computer's file system. It's running on your own machine, not remotely.

The expression maps are stored locally on your computer, but the browser needs an HTTP server as a bridge to access them due to browser security restrictions.
