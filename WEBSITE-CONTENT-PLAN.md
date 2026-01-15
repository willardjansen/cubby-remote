# Cubby Remote - Website Content Plan

## Overview
A minimal, modern single-page website to introduce Cubby Remote, show how it works, and provide downloads.

---

## Site Structure

```
┌─────────────────────────────────────┐
│           Hero Section              │
├─────────────────────────────────────┤
│         Features (3 cards)          │
├─────────────────────────────────────┤
│      How It Works (3 steps)         │
├─────────────────────────────────────┤
│         Screenshots Gallery         │
├─────────────────────────────────────┤
│       Download Section              │
├─────────────────────────────────────┤
│            Footer                   │
└─────────────────────────────────────┘
```

---

## Section 1: Hero

### Headline
**Control Cubase Articulations from Your iPad**

### Subheadline
A wireless remote for expression maps. Tap to switch articulations. Works with any iPad, no app install required.

### Call to Action Buttons
- **Download for Mac** (primary)
- **Download for Windows** (primary)
- **View on GitHub** (secondary/text link)

### Hero Visual
- Screenshot or mockup of iPad showing the app with articulation buttons
- Optional: Subtle animation showing a tap → articulation change

---

## Section 2: Features (3 Cards)

### Feature 1: Wireless & Simple
**Icon:** WiFi or wireless signal

**Headline:** No Cables, No Apps

**Copy:** Works in your iPad's browser over WiFi. No App Store downloads, no MIDI cables. Just open the URL and start playing.

---

### Feature 2: Auto Track Switching
**Icon:** Refresh/sync arrows or magic wand

**Headline:** Follows Your Session

**Copy:** Select a track in Cubase, and Cubby automatically loads the matching expression map. Stay in your creative flow.

---

### Feature 3: Your Expression Maps
**Icon:** Folder or upload icon

**Headline:** Use Your Own Maps

**Copy:** Drop in your existing Cubase expression maps. Cubby reads them directly - no conversion or setup needed.

---

## Section 3: How It Works (3 Steps)

### Visual Style
Horizontal timeline or numbered steps with icons/illustrations

---

### Step 1: Install & Launch
**Visual:** App icon in dock/taskbar

**Copy:** Download Cubby Remote and run it. The app lives in your menu bar and starts a local server.

---

### Step 2: Connect Your iPad
**Visual:** iPad with URL bar showing IP address

**Copy:** Open Safari on your iPad and go to the address shown in the app (e.g., http://192.168.1.100:3000). That's it - you're connected.

---

### Step 3: Tap to Play
**Visual:** Finger tapping an articulation button

**Copy:** Your expression map appears as colorful buttons. Tap any articulation and hear it instantly in Cubase.

---

## Section 4: Screenshots Gallery

### Screenshots Needed

1. **Main Interface** - iPad showing articulation grid with colorful buttons
2. **Track Switching** - Split view: Cubase track list + iPad updating
3. **Menu Bar App** - macOS menu bar with Cubby icon and dropdown menu
4. **Server Maps** - Library panel showing available expression maps
5. **Search/Filter** - Using search to find articulations in a large library

### Gallery Style
- Carousel or grid layout
- Click to enlarge (lightbox)
- Device frames (iPad, Mac) for polish

---

## Section 5: Download

### Headline
**Get Cubby Remote**

### Subheadline
Free and open source. Available for macOS and Windows.

### Download Cards

#### macOS
- **Icon:** Apple logo
- **Button:** Download for Mac
- **Subtext:** macOS 10.13+ / Intel & Apple Silicon
- **File:** Cubby Remote-1.0.0-arm64.dmg (or universal)

#### Windows
- **Icon:** Windows logo
- **Button:** Download for Windows
- **Subtext:** Windows 10/11 64-bit
- **File:** Cubby Remote Setup 1.0.0.exe

### Additional Links
- View on GitHub
- Setup Instructions
- Report an Issue

---

## Section 6: Footer

### Content
- **Logo/Name:** Cubby Remote
- **Tagline:** Expression map control for Cubase
- **Links:** GitHub | Documentation | License (MIT)
- **Copyright:** © 2026 - Open Source

---

## Design Guidelines

### Color Palette (from app)
- **Primary:** #e94560 (coral red)
- **Background Dark:** #1a1a2e (deep navy)
- **Background Mid:** #16213e (dark blue)
- **Accent:** #0f3460 (medium blue)
- **Text:** #ffffff (white)
- **Text Muted:** #a0a0a0 (gray)

### Typography Suggestions
- **Headlines:** Inter, SF Pro Display, or similar modern sans-serif
- **Body:** System font stack for performance
- **Monospace:** For code/URLs - JetBrains Mono or SF Mono

### Visual Style
- Dark theme (matches the app)
- Subtle gradients
- Rounded corners (consistent with app buttons)
- Generous whitespace
- Smooth scroll animations
- Device mockups for screenshots

---

## Screenshots To Capture

| Screenshot | Description | Device Frame |
|------------|-------------|--------------|
| hero-ipad.png | Main articulation grid, vibrant colors | iPad Pro |
| feature-wireless.png | iPad + Mac on same desk, no cables | None (photo style) |
| step-menubar.png | macOS menu bar with Cubby dropdown | Mac menubar crop |
| step-connect.png | iPad Safari with URL | iPad |
| step-tap.png | Finger on articulation button | iPad with hand |
| gallery-library.png | Server maps panel open | iPad |
| gallery-search.png | Search filtering articulations | iPad |
| gallery-cubase.png | Cubase + iPad side by side | Split/composite |

---

## Copy Tone

- **Confident but not salesy** - It's a free tool, no need to oversell
- **Technical but accessible** - Musicians aren't always tech experts
- **Concise** - Minimal site = minimal words
- **Friendly** - Open source community vibe

---

## SEO / Meta

### Page Title
Cubby Remote - iPad Controller for Cubase Expression Maps

### Meta Description
Control Cubase articulations from your iPad. Free, wireless expression map remote. Auto-loads maps when you switch tracks. Download for Mac and Windows.

### Keywords
- Cubase expression maps
- Cubase iPad controller
- Cubase articulation switcher
- Cubase remote control
- Expression map remote
- Cubase MIDI controller iPad

---

## Optional Additions (Future)

- **Video demo** - 30-60 second screencast showing the workflow
- **Testimonials** - Quotes from composers/producers using it
- **FAQ section** - Common questions (Does it work with Cubase 12? etc.)
- **Newsletter signup** - For updates on new versions
- **Comparison table** - vs. other solutions (Lemur, TouchOSC, etc.)

---

## Tech Stack Suggestions

For a minimal modern site:
- **Static:** Astro, Next.js static export, or plain HTML
- **Styling:** Tailwind CSS (matches your app)
- **Hosting:** GitHub Pages, Vercel, or Netlify (free)
- **Analytics:** Plausible or Simple Analytics (privacy-friendly)

---

Delete this file after the website is built.
