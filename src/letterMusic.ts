// A quiet, locally synthesized music box — no streaming or recorded audio needed.
const beat = 60 / 76;
const melody = [
  [72, .75], [72, .25], [74, 1], [72, 1], [77, 1], [76, 2],
  [72, .75], [72, .25], [74, 1], [72, 1], [79, 1], [77, 2],
  [72, .75], [72, .25], [84, 1], [81, 1], [77, 1], [76, 1], [74, 1],
  [82, .75], [82, .25], [81, 1], [77, 1], [79, 1], [77, 3],
] as const;
const notes: { at: number; midi: number; volume: number }[] = [];
let length = 0;
for (const [midi, duration] of melody) {
  notes.push({ at: length * beat, midi, volume: .7 });
  length += duration;
}
// Widely spaced accompaniment leaves room for the words on the page.
for (const [at, chord] of [[0, [53, 60, 65]], [6, [60, 64, 67]], [12, [53, 60, 65]], [18, [58, 62, 65]], [21, [60, 64, 67]], [22, [53, 60, 65]]] as const) {
  chord.forEach((midi, i) => notes.push({ at: (at + i * .45) * beat, midi, volume: .18 }));
}
notes.sort((a, b) => a.at - b.at);
const loopLength = (length + 4) * beat;

export class LetterMusic {
  private context?: AudioContext;
  private output?: GainNode;
  private listeners = new Set<() => void>();
  private enabled = true;
  private revealed = false;
  private closed = false;
  private timer?: ReturnType<typeof setTimeout>;
  private origin?: number;
  private index = 0;
  private generation = 0;

  constructor() {
    try {
      const ctx = new AudioContext();
      this.context = ctx;
      const output = ctx.createGain();
      output.gain.value = .18;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass'; tone.frequency.value = 4200;
      output.connect(tone); tone.connect(ctx.destination);
      // Soft, short echoes add space without an abrupt or comic attack.
      const delay = ctx.createDelay(1);
      delay.delayTime.value = .23;
      const echo = ctx.createGain(); echo.gain.value = .16;
      tone.connect(delay); delay.connect(echo); echo.connect(ctx.destination);
      this.output = output;
      ctx.onstatechange = () => { this.schedule(); this.notify(); };
      // Called synchronously from the photo tap to unlock audio on iOS.
      this.resume();
    } catch { this.enabled = false; }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getSnapshot = () => !this.context ? 'unavailable' : !this.enabled || this.context.state !== 'running' ? 'muted' : this.revealed ? 'playing' : 'preparing';
  private notify() { this.listeners.forEach(listener => listener()); }

  reveal() {
    if (this.closed || this.revealed) return;
    this.revealed = true;
    this.schedule(); this.notify();
  }

  resume() {
    const ctx = this.context;
    if (!ctx || this.closed) return;
    this.enabled = true;
    const generation = ++this.generation;
    void ctx.resume().then(() => {
      if (this.closed || generation !== this.generation) return;
      this.schedule(); this.notify();
    }).catch(() => {
      if (this.closed || generation !== this.generation) return;
      this.enabled = false; this.notify();
    });
  }

  pause() {
    if (this.closed) return;
    this.enabled = false; this.generation++;
    clearTimeout(this.timer); this.timer = undefined;
    void this.context?.suspend().catch(() => {});
    this.notify();
  }

  close() {
    this.closed = true; this.generation++;
    clearTimeout(this.timer); this.timer = undefined;
    if (this.context) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => {});
    }
  }

  private schedule() {
    const ctx = this.context;
    if (!ctx || this.closed || !this.enabled || !this.revealed || ctx.state !== 'running' || this.timer !== undefined) return;
    if (this.origin === undefined || this.origin + notes[this.index].at < ctx.currentTime - .3) {
      this.origin = ctx.currentTime + .08; this.index = 0;
    }
    while (this.origin + notes[this.index].at < ctx.currentTime + .25) {
      const note = notes[this.index];
      this.chime(note.midi, this.origin + note.at, note.volume);
      if (++this.index === notes.length) { this.index = 0; this.origin += loopLength; }
    }
    this.timer = setTimeout(() => { this.timer = undefined; this.schedule(); }, 100);
  }

  private chime(midi: number, at: number, volume: number) {
    const ctx = this.context!;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    for (const [ratio, strength, decay] of [[1, 1, 2.8], [2, .2, 1.3], [3, .045, .65]]) {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency * ratio;
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(volume * strength, at + .012);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + decay);
      oscillator.connect(envelope); envelope.connect(this.output!);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(at); oscillator.stop(at + decay + .05);
    }
  }
}
