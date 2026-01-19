# Data Signatures

> Type definitions and example values for all data structures in Cubby Remote

---

## Core Domain Models

### [ExpressionMap]

The main container for a Cubase expression map.

**Signature:**
```
ExpressionMap:
  name: string not null              // Display name from XML
  fileName: string not null          // Original file name
  articulations: Articulation[]      // List of playable articulations
  isMerged: boolean optional         // True if combined from multiple maps
  sourceMapNames: string[] optional  // Names of original maps if merged
```

**Example:**
```json
{
  "name": "Amati Viola",
  "fileName": "Amati Viola.expressionmap",
  "articulations": [...],
  "isMerged": false
}
```

---

### [Articulation]

A single playable articulation (legato, staccato, etc).

**Signature:**
```
Articulation:
  id: string not null                // Unique identifier (generated)
  name: string not null              // Full display name
  shortName: string not null         // Abbreviated name for buttons
  description: string not null       // Tooltip text
  color: number not null             // Cubase color index (0-16)
  group: number not null             // Visual grouping (0-based)
  midiMessages: MidiMessage[]        // Output MIDI sent to sampler
  remoteTrigger: RemoteTrigger optional  // Input MIDI we send to Cubase
  keySwitch: number optional         // Key switch note (0-127)
  articulationType: number not null  // 0=attribute, 1=direction
  midiChannel: number optional       // For merged maps (0-15)
  sourceMap: string optional         // Origin map name if merged
```

**Example:**
```json
{
  "id": "art_0_1737312000000",
  "name": "Legato",
  "shortName": "Leg",
  "description": "Smooth connected notes",
  "color": 3,
  "group": 0,
  "midiMessages": [{ "status": 144, "data1": 24, "data2": 127 }],
  "remoteTrigger": { "status": 144, "data1": 0, "isAutoAssigned": false },
  "keySwitch": 24,
  "articulationType": 1
}
```

---

### [MidiMessage]

A single MIDI message (Note On, CC, etc).

**Signature:**
```
MidiMessage:
  status: number not null   // MIDI status byte (128-255)
  data1: number not null    // First data byte (0-127) - note or CC number
  data2: number not null    // Second data byte (0-127) - velocity or value
```

**Common status values:**
```
144 (0x90) = Note On Channel 1
128 (0x80) = Note Off Channel 1
176 (0xB0) = Control Change Channel 1
```

**Example:**
```json
{
  "status": 144,    // Note On, Channel 1
  "data1": 36,      // Note C2
  "data2": 127      // Velocity 127
}
```

---

### [RemoteTrigger]

The MIDI message we send TO Cubase to activate an articulation.

**Signature:**
```
RemoteTrigger:
  status: number not null           // Always 144 (Note On)
  data1: number not null            // MIDI note (0-127)
  isAutoAssigned: boolean optional  // True if auto-generated
```

**Example:**
```json
{
  "status": 144,
  "data1": 0,              // C-2 (lowest MIDI note)
  "isAutoAssigned": true   // Was not in original file
}
```

---

## MIDI Handler Models

### [MidiState]

Current state of the MIDI subsystem.

**Signature:**
```
MidiState:
  isSupported: boolean not null       // Browser supports MIDI
  isConnected: boolean not null       // Currently connected to output
  outputs: MidiOutput[] not null      // Available output devices
  inputs: MidiInput[] not null        // Available input devices
  selectedOutputId: string nullable   // Currently selected output
  selectedInputId: string nullable    // Currently selected input
  error: string nullable              // Error message if any
  useWebSocket: boolean not null      // Using WebSocket fallback
  webSocketPort: string optional      // WebSocket port name
```

**Example:**
```json
{
  "isSupported": true,
  "isConnected": true,
  "outputs": [...],
  "inputs": [...],
  "selectedOutputId": "output-1234",
  "selectedInputId": null,
  "error": null,
  "useWebSocket": false
}
```

---

### [MidiOutput]

A MIDI output device.

**Signature:**
```
MidiOutput:
  id: string not null            // Browser-assigned device ID
  name: string not null          // Human-readable name
  manufacturer: string not null  // Device manufacturer
  output: MIDIOutput nullable    // Web MIDI API object (null for WebSocket)
```

**Example:**
```json
{
  "id": "output-abc123",
  "name": "IAC Driver Bus 1",
  "manufacturer": "Apple Inc.",
  "output": [MIDIOutput object]
}
```

---

### [MidiInput]

A MIDI input device.

**Signature:**
```
MidiInput:
  id: string not null            // Browser-assigned device ID
  name: string not null          // Human-readable name
  manufacturer: string not null  // Device manufacturer
  input: MIDIInput not null      // Web MIDI API object
```

**Example:**
```json
{
  "id": "input-xyz789",
  "name": "ArticulationRemote",
  "manufacturer": "Tobias Erichsen",
  "input": [MIDIInput object]
}
```

---

## WebSocket Protocol

### [WebSocket Message: MIDI Out]

Browser → Server: Send MIDI to Cubase.

**Signature:**
```
MidiOutMessage:
  type: "midi" literal
  status: number not null   // MIDI status byte
  data1: number not null    // First data byte
  data2: number not null    // Second data byte
```

**Example:**
```json
{
  "type": "midi",
  "status": 144,
  "data1": 60,
  "data2": 127
}
```

---

### [WebSocket Message: Track Change]

Server → Browser: Track changed in Cubase.

**Signature:**
```
TrackChangeMessage:
  type: "trackChange" literal
  trackName: string not null   // Name of selected track
```

**Example:**
```json
{
  "type": "trackChange",
  "trackName": "Amati Viola"
}
```

---

### [WebSocket Message: Connection]

Server → Browser: Connection status.

**Signature:**
```
ConnectionMessage:
  type: "connected" | "pong" literal
  port: string optional   // MIDI port name
```

**Example:**
```json
{
  "type": "connected",
  "port": "Browser to Cubase"
}
```

---

## Track Name Protocol (MIDI CC)

Cubase sends track names via CC on channel 16 (status 0xBF = 191).

### [Track Name Start]
```
CC 119 (Start Marker):
  status: 191 (0xBF)        // CC on Channel 16
  data1: 119                // CC number for start
  data2: number (1-127)     // Length of track name
```

### [Track Name Character]
```
CC 118 (Character):
  status: 191 (0xBF)
  data1: 118
  data2: number (0-127)     // ASCII char & 0x7F
```

### [Track Name End]
```
CC 117 (End Marker):
  status: 191 (0xBF)
  data1: 117
  data2: 127                // Always 127
```

**Example sequence for "Viola":**
```
[191, 119, 5]    // Start, 5 chars
[191, 118, 86]   // 'V' (86)
[191, 118, 105]  // 'i' (105)
[191, 118, 111]  // 'o' (111)
[191, 118, 108]  // 'l' (108)
[191, 118, 97]   // 'a' (97)
[191, 117, 127]  // End
```

---

## API Response Models

### [GET /api/expression-maps]

List available expression maps.

**Response Signature:**
```
ExpressionMapList:
  maps: MapEntry[] not null

MapEntry:
  name: string not null       // Display name (without extension)
  filename: string not null   // Full filename
```

**Example:**
```json
{
  "maps": [
    { "name": "Amati Viola", "filename": "Amati Viola.expressionmap" },
    { "name": "Berlin Strings", "filename": "Berlin Strings.expressionmap" }
  ]
}
```

---

## Constants

### [Cubase Colors]

Color index to CSS hex mapping.

```
CUBASE_COLORS:
  0: "#808080"   // Gray (default)
  1: "#e74c3c"   // Red
  2: "#3498db"   // Blue
  3: "#2ecc71"   // Green
  4: "#f39c12"   // Orange
  5: "#9b59b6"   // Purple
  6: "#1abc9c"   // Teal
  7: "#e91e63"   // Pink
  8: "#00bcd4"   // Cyan
  9: "#ff5722"   // Deep Orange
  10: "#8bc34a"  // Light Green
  11: "#ffeb3b"  // Yellow
  12: "#795548"  // Brown
  13: "#607d8b"  // Blue Gray
  14: "#673ab7"  // Deep Purple
  15: "#03a9f4"  // Light Blue
  16: "#cddc39"  // Lime
```

---

## LocalStorage Keys

```
cubase-remote-midi-output: string   // Selected MIDI output device ID
cubase-remote-midi-input: string    // Selected MIDI input device ID
```

---

*Generated from source: src/lib/expressionMapParser.ts, src/lib/midiHandler.ts*
