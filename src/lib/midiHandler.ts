import type { MidiMessage } from './expressionMapParser';

export interface MidiOutput {
  id: string;
  name: string;
  manufacturer: string;
  output: WebMidi.MIDIOutput | null;
}

export interface MidiInput {
  id: string;
  name: string;
  manufacturer: string;
  input: WebMidi.MIDIInput;
}

export interface MidiState {
  isSupported: boolean;
  isConnected: boolean;
  outputs: MidiOutput[];
  inputs: MidiInput[];
  selectedOutputId: string | null;
  selectedInputId: string | null;
  error: string | null;
  useWebSocket: boolean;
  webSocketPort?: string;
}

// Track switch listener callback types
export type TrackSwitchCallback = (trackIndex: number) => void;
export type TrackNameCallback = (trackName: string) => void;

const MIDI_OUTPUT_STORAGE_KEY = 'cubase-remote-midi-output';
const MIDI_INPUT_STORAGE_KEY = 'cubase-remote-midi-input';
const WS_PORT = 7101;

class MidiHandler {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private selectedOutput: WebMidi.MIDIOutput | null = null;
  private selectedInput: WebMidi.MIDIInput | null = null;
  private listeners: Set<(state: MidiState) => void> = new Set();
  private trackSwitchListeners: Set<TrackSwitchCallback> = new Set();
  private trackNameListeners: Set<TrackNameCallback> = new Set();
  private channel: number = 0; // Default MIDI channel (0-15)

  // WebSocket fallback
  private webSocket: WebSocket | null = null;
  private useWebSocket: boolean = false;
  private wsPortName: string = '';
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async initialize(): Promise<MidiState> {
    // Try Web MIDI first
    if (navigator.requestMIDIAccess) {
      try {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

        // Listen for device changes
        this.midiAccess.onstatechange = () => {
          this.notifyListeners();
        };

        // Try to restore saved output selection, or auto-select IAC/loopMIDI
        this.autoSelectOutput();
        this.autoSelectInput();

        console.log('[MIDI] Web MIDI initialized');

        // Also connect WebSocket for receiving track names from Cubase
        this.connectWebSocketForTrackNames();

        return this.getState();
      } catch (error) {
        console.warn('[MIDI] Web MIDI failed:', error);
        // Fall through to WebSocket
      }
    }

    // Fallback to WebSocket
    console.log('[MIDI] Web MIDI not available, trying WebSocket...');
    return this.initWebSocket();
  }

  // Connect to WebSocket just for receiving track names (used when Web MIDI handles output)
  private connectWebSocketForTrackNames(): void {
    const wsHost = window.location.hostname || 'localhost';
    const wsUrl = `ws://${wsHost}:${WS_PORT}`;

    console.log(`[MIDI] Connecting WebSocket for track names: ${wsUrl}`);

    try {
      const trackWs = new WebSocket(wsUrl);

      trackWs.onopen = () => {
        console.log('[MIDI] WebSocket connected for track names');
      };

      trackWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'trackChange' && msg.trackName) {
            console.log(`[MIDI] Track changed: "${msg.trackName}"`);
            this.trackNameListeners.forEach(cb => cb(msg.trackName));
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      trackWs.onerror = () => {
        console.log('[MIDI] WebSocket for track names failed (midi-server may not be running)');
      };

      trackWs.onclose = () => {
        // Reconnect after 5 seconds
        setTimeout(() => this.connectWebSocketForTrackNames(), 5000);
      };
    } catch (e) {
      console.log('[MIDI] Could not create WebSocket for track names');
    }
  }

  private async initWebSocket(): Promise<MidiState> {
    return new Promise((resolve) => {
      // Determine WebSocket URL based on current page location
      const wsHost = window.location.hostname || 'localhost';
      const wsUrl = `ws://${wsHost}:${WS_PORT}`;

      console.log(`[MIDI] Connecting to WebSocket: ${wsUrl}`);

      try {
        this.webSocket = new WebSocket(wsUrl);

        this.webSocket.onopen = () => {
          console.log('[MIDI] WebSocket connected');
          this.useWebSocket = true;
          // Send ping to get port info (use setTimeout to ensure connection is ready)
          setTimeout(() => {
            if (this.webSocket?.readyState === WebSocket.OPEN) {
              this.webSocket.send(JSON.stringify({ type: 'ping' }));
            }
          }, 100);
        };

        this.webSocket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'connected' || msg.type === 'pong') {
              this.wsPortName = msg.port || 'MIDI Bridge';
              this.notifyListeners();
              resolve(this.getState());
            } else if (msg.type === 'trackChange' && msg.trackName) {
              // Received track name from Cubase via midi-server
              console.log(`[MIDI] Track changed: "${msg.trackName}"`);
              this.trackNameListeners.forEach(cb => cb(msg.trackName));
            }
          } catch (e) {
            console.error('[MIDI] WebSocket message error:', e);
          }
        };

        this.webSocket.onerror = (error) => {
          console.error('[MIDI] WebSocket error:', error);
          this.useWebSocket = false;
          resolve(this.getState({ error: 'MIDI Bridge not running. Start with: node midi-server.js' }));
        };

        this.webSocket.onclose = () => {
          console.log('[MIDI] WebSocket closed');
          this.useWebSocket = false;
          this.wsPortName = '';
          this.notifyListeners();

          // Try to reconnect after 3 seconds
          if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = setTimeout(() => {
            console.log('[MIDI] Attempting WebSocket reconnect...');
            this.initWebSocket();
          }, 3000);
        };

        // Timeout if connection takes too long
        setTimeout(() => {
          if (!this.useWebSocket) {
            resolve(this.getState({ error: 'MIDI Bridge not running. Start with: node midi-server.js' }));
          }
        }, 2000);
      } catch (e) {
        console.error('[MIDI] WebSocket creation failed:', e);
        resolve(this.getState({ error: 'Failed to create WebSocket connection' }));
      }
    });
  }

  private autoSelectOutput(): void {
    if (!this.midiAccess) return;

    // Collect all outputs into an array for easier handling
    const allOutputs: WebMidi.MIDIOutput[] = [];
    try {
      if (typeof this.midiAccess.outputs.forEach === 'function') {
        this.midiAccess.outputs.forEach((output: WebMidi.MIDIOutput) => {
          if (output) allOutputs.push(output);
        });
      } else {
        const outputsObj = this.midiAccess.outputs as unknown as Record<string, WebMidi.MIDIOutput>;
        Object.keys(outputsObj).forEach(key => {
          const output = outputsObj[key];
          if (output) allOutputs.push(output);
        });
      }
    } catch (e) {
      console.error('[MIDI] Error collecting outputs:', e);
    }

    // Try to restore from localStorage first
    const savedOutputId = localStorage.getItem(MIDI_OUTPUT_STORAGE_KEY);
    if (savedOutputId) {
      const savedOutput = allOutputs.find(o => o.id === savedOutputId);
      if (savedOutput) {
        this.selectedOutput = savedOutput;
        console.log(`[MIDI] Restored output: ${savedOutput.name}`);
        return;
      }
    }

    // Auto-select IAC Driver (macOS), loopMIDI (Windows), or Session (Network MIDI)
    const preferredNames = ['IAC Driver', 'loopMIDI', 'Browser to Cubase', 'Session'];

    for (const preferredName of preferredNames) {
      const match = allOutputs.find(output =>
        output.name?.toLowerCase().includes(preferredName.toLowerCase())
      );
      if (match) {
        this.selectedOutput = match;
        localStorage.setItem(MIDI_OUTPUT_STORAGE_KEY, match.id);
        console.log(`[MIDI] Auto-selected output: ${match.name}`);
        return;
      }
    }
  }

  private autoSelectInput(): void {
    if (!this.midiAccess) return;

    // Collect all inputs into an array
    const allInputs: WebMidi.MIDIInput[] = [];
    try {
      if (typeof this.midiAccess.inputs.forEach === 'function') {
        this.midiAccess.inputs.forEach((input: WebMidi.MIDIInput) => {
          if (input) allInputs.push(input);
        });
      } else {
        const inputsObj = this.midiAccess.inputs as unknown as Record<string, WebMidi.MIDIInput>;
        Object.keys(inputsObj).forEach(key => {
          const input = inputsObj[key];
          if (input) allInputs.push(input);
        });
      }
    } catch (e) {
      console.error('[MIDI] Error collecting inputs:', e);
    }

    // Try to restore from localStorage
    const savedInputId = localStorage.getItem(MIDI_INPUT_STORAGE_KEY);
    if (savedInputId) {
      const savedInput = allInputs.find(i => i.id === savedInputId);
      if (savedInput) {
        this.selectedInput = savedInput;
        this.selectedInput.onmidimessage = this.handleMidiMessage.bind(this);
        console.log(`[MIDI] Restored input: ${savedInput.name}`);
      }
    }
  }

  getState(overrides: Partial<MidiState> = {}): MidiState {
    const outputs: MidiOutput[] = [];
    const inputs: MidiInput[] = [];

    if (this.midiAccess) {
      // Handle various Web MIDI implementations (standard Map, Array, or plain Object)
      try {
        // Try forEach first (works on Maps)
        if (typeof this.midiAccess.outputs.forEach === 'function') {
          this.midiAccess.outputs.forEach((output: WebMidi.MIDIOutput) => {
            if (output && output.id) {
              outputs.push({
                id: output.id,
                name: output.name || 'Unknown Device',
                manufacturer: output.manufacturer || 'Unknown',
                output,
              });
            }
          });
        } else {
          // Fallback: iterate as plain object
          const outputsObj = this.midiAccess.outputs as unknown as Record<string, WebMidi.MIDIOutput>;
          Object.keys(outputsObj).forEach(key => {
            const output = outputsObj[key];
            if (output && output.id) {
              outputs.push({
                id: output.id,
                name: output.name || 'Unknown Device',
                manufacturer: output.manufacturer || 'Unknown',
                output,
              });
            }
          });
        }
      } catch (e) {
        console.error('[MIDI] Error iterating outputs:', e);
      }

      try {
        if (typeof this.midiAccess.inputs.forEach === 'function') {
          this.midiAccess.inputs.forEach((input: WebMidi.MIDIInput) => {
            if (input && input.id) {
              inputs.push({
                id: input.id,
                name: input.name || 'Unknown Device',
                manufacturer: input.manufacturer || 'Unknown',
                input,
              });
            }
          });
        } else {
          const inputsObj = this.midiAccess.inputs as unknown as Record<string, WebMidi.MIDIInput>;
          Object.keys(inputsObj).forEach(key => {
            const input = inputsObj[key];
            if (input && input.id) {
              inputs.push({
                id: input.id,
                name: input.name || 'Unknown Device',
                manufacturer: input.manufacturer || 'Unknown',
                input,
              });
            }
          });
        }
      } catch (e) {
        console.error('[MIDI] Error iterating inputs:', e);
      }
    }

    // Add WebSocket as an output option if connected
    if (this.useWebSocket) {
      outputs.unshift({
        id: 'websocket-bridge',
        name: `MIDI Bridge (${this.wsPortName})`,
        manufacturer: 'WebSocket',
        output: null,
      });
    }

    const isConnected = this.useWebSocket
      ? (this.webSocket?.readyState === WebSocket.OPEN)
      : (this.selectedOutput !== null && this.selectedOutput.state === 'connected');

    return {
      isSupported: !!navigator.requestMIDIAccess || this.useWebSocket,
      isConnected,
      outputs,
      inputs,
      selectedOutputId: this.useWebSocket ? 'websocket-bridge' : (this.selectedOutput?.id || null),
      selectedInputId: this.selectedInput?.id || null,
      error: null,
      useWebSocket: this.useWebSocket,
      webSocketPort: this.wsPortName,
      ...overrides,
    };
  }

  selectOutput(outputId: string): boolean {
    if (!this.midiAccess) return false;

    // Find output by iterating (works with any implementation)
    let foundOutput: WebMidi.MIDIOutput | null = null;
    try {
      if (typeof this.midiAccess.outputs.forEach === 'function') {
        this.midiAccess.outputs.forEach((output: WebMidi.MIDIOutput) => {
          if (output && output.id === outputId) foundOutput = output;
        });
      } else {
        const outputsObj = this.midiAccess.outputs as unknown as Record<string, WebMidi.MIDIOutput>;
        Object.keys(outputsObj).forEach(key => {
          const output = outputsObj[key];
          if (output && output.id === outputId) foundOutput = output;
        });
      }
    } catch (e) {
      console.error('[MIDI] Error finding output:', e);
    }

    if (foundOutput) {
      this.selectedOutput = foundOutput;
      localStorage.setItem(MIDI_OUTPUT_STORAGE_KEY, outputId);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  selectInput(inputId: string): boolean {
    if (!this.midiAccess) return false;

    // Remove listener from previous input
    if (this.selectedInput) {
      this.selectedInput.onmidimessage = null;
    }

    // Find input by iterating
    let foundInput: WebMidi.MIDIInput | null = null;
    try {
      if (typeof this.midiAccess.inputs.forEach === 'function') {
        this.midiAccess.inputs.forEach((input: WebMidi.MIDIInput) => {
          if (input && input.id === inputId) foundInput = input;
        });
      } else {
        const inputsObj = this.midiAccess.inputs as unknown as Record<string, WebMidi.MIDIInput>;
        Object.keys(inputsObj).forEach(key => {
          const input = inputsObj[key];
          if (input && input.id === inputId) foundInput = input;
        });
      }
    } catch (e) {
      console.error('[MIDI] Error finding input:', e);
    }

    if (foundInput) {
      const input = foundInput as WebMidi.MIDIInput;
      this.selectedInput = input;
      localStorage.setItem(MIDI_INPUT_STORAGE_KEY, inputId);
      // Set up message handler
      input.onmidimessage = this.handleMidiMessage.bind(this);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  private handleMidiMessage(event: WebMidi.MIDIMessageEvent): void {
    const data = event.data;
    const status = data[0];
    const data1 = data[1];
    const data2 = data[2];

    // Check for track switch messages on channel 16 (0x9F = Note On Ch16)
    if ((status & 0xF0) === 0x90 && (status & 0x0F) === 15) {
      // Note On on channel 16 = track switch
      console.log(`[MIDI In] Track switch: Track ${data1 + 1}`);
      this.trackSwitchListeners.forEach(cb => cb(data1));
    }

    // Also check for CC 117-119 on channel 16 for track name protocol
    if (status === 0xBF) {
      // CC on channel 16
      if (data1 === 117) {
        console.log('[MIDI In] Track name end marker');
      } else if (data1 === 118) {
        console.log(`[MIDI In] Track name char: ${String.fromCharCode(data2)}`);
      } else if (data1 === 119) {
        console.log(`[MIDI In] Track name start, length: ${data2}`);
      }
    }
  }

  // Subscribe to track switch events (by index)
  onTrackSwitch(callback: TrackSwitchCallback): () => void {
    this.trackSwitchListeners.add(callback);
    return () => this.trackSwitchListeners.delete(callback);
  }

  // Subscribe to track name changes (from Cubase MIDI Remote script)
  onTrackName(callback: TrackNameCallback): () => void {
    this.trackNameListeners.add(callback);
    return () => this.trackNameListeners.delete(callback);
  }

  setChannel(channel: number): void {
    this.channel = Math.max(0, Math.min(15, channel));
  }

  getChannel(): number {
    return this.channel;
  }

  sendMessages(messages: MidiMessage[], useGlobalChannel: boolean = true): boolean {
    // Use WebSocket if available
    if (this.useWebSocket && this.webSocket?.readyState === WebSocket.OPEN) {
      for (const msg of messages) {
        let status = msg.status;
        if (useGlobalChannel && status >= 128 && status < 240) {
          const messageType = status & 0xF0;
          status = messageType | this.channel;
        }

        console.log(`[MIDI] Sending via WebSocket: [${status}, ${msg.data1}, ${msg.data2}]`);
        this.webSocket.send(JSON.stringify({
          type: 'midi',
          status,
          data1: msg.data1,
          data2: msg.data2
        }));
      }
      return true;
    }

    // Fall back to Web MIDI
    if (!this.selectedOutput) {
      console.warn('[MIDI] No MIDI output selected');
      return false;
    }

    for (const msg of messages) {
      try {
        // Adjust status byte for channel (for note on/off and CC messages)
        let status = msg.status;
        if (useGlobalChannel && status >= 128 && status < 240) {
          // Channel voice message - apply channel offset
          const messageType = status & 0xF0;
          status = messageType | this.channel;
        }

        const midiData = [status, msg.data1, msg.data2];
        console.log(`[MIDI] Sending: [${midiData.join(', ')}] to ${this.selectedOutput.name || 'output'}`);

        // Send the MIDI data
        this.selectedOutput.send(midiData);
        console.log(`[MIDI] Sent OK`);
      } catch (error) {
        console.error('[MIDI] Send error:', error);
        return false;
      }
    }
    return true;
  }

  // Send a note on message
  sendNoteOn(note: number, velocity: number = 127): boolean {
    return this.sendMessages([{
      status: 0x90, // Note On
      data1: note,
      data2: velocity,
    }]);
  }

  // Send a note off message
  sendNoteOff(note: number): boolean {
    return this.sendMessages([{
      status: 0x80, // Note Off
      data1: note,
      data2: 0,
    }]);
  }

  // Send CC message
  sendCC(cc: number, value: number): boolean {
    return this.sendMessages([{
      status: 0xB0, // Control Change
      data1: cc,
      data2: value,
    }]);
  }

  subscribe(listener: (state: MidiState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

// Singleton instance
export const midiHandler = new MidiHandler();
