// Small synthesized sound effects (no audio files, nothing licensed).
// Browsers, iPhone Safari especially, only allow sound after a tap, so call unlockSfx()
// from a click handler before the first playSlapshot(). The iPhone silent switch mutes these.

type AC = typeof AudioContext;
let ctx: AudioContext | null = null;

export function unlockSfx() {
  if (typeof window === "undefined") return;
  const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
  if (!Ctor) return;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  // A silent blip inside the tap fully unlocks audio on iOS.
  const b = ctx.createBuffer(1, 1, ctx.sampleRate);
  const s = ctx.createBufferSource();
  s.buffer = b;
  s.connect(ctx.destination);
  s.start();
}

function noise(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

// A slapshot: the crack of the stick, a low thump, then the puck hitting the boards.
export function playSlapshot() {
  const c = ctx;
  if (!c || c.state !== "running") return;
  const t = c.currentTime + 0.02;
  const out = c.createGain();
  out.gain.value = 0.7;
  out.connect(c.destination);

  // Stick crack: a sharp, bright burst of noise.
  const crack = noise(c, 0.12);
  const crackFilter = c.createBiquadFilter();
  crackFilter.type = "bandpass";
  crackFilter.frequency.value = 2600;
  crackFilter.Q.value = 0.9;
  const crackGain = c.createGain();
  crackGain.gain.setValueAtTime(0.0001, t);
  crackGain.gain.exponentialRampToValueAtTime(1, t + 0.004);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  crack.connect(crackFilter).connect(crackGain).connect(out);
  crack.start(t);
  crack.stop(t + 0.12);

  // Body of the shot: a quick low thump that drops in pitch.
  const thump = c.createOscillator();
  thump.type = "triangle";
  thump.frequency.setValueAtTime(180, t);
  thump.frequency.exponentialRampToValueAtTime(55, t + 0.14);
  const thumpGain = c.createGain();
  thumpGain.gain.setValueAtTime(0.0001, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.8, t + 0.006);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  thump.connect(thumpGain).connect(out);
  thump.start(t);
  thump.stop(t + 0.2);

  // Puck into the boards a beat later: a duller, rattling smack.
  const hit = t + 0.24;
  const boards = noise(c, 0.25);
  const boardsFilter = c.createBiquadFilter();
  boardsFilter.type = "lowpass";
  boardsFilter.frequency.value = 1400;
  const boardsGain = c.createGain();
  boardsGain.gain.setValueAtTime(0.0001, hit);
  boardsGain.gain.exponentialRampToValueAtTime(0.55, hit + 0.008);
  boardsGain.gain.exponentialRampToValueAtTime(0.0001, hit + 0.22);
  boards.connect(boardsFilter).connect(boardsGain).connect(out);
  boards.start(hit);
  boards.stop(hit + 0.25);
}
