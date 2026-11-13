// Sound effects for the goal replay reel.
// "Hockey Puck Slap" by jameb32, from SoundBible.com, licensed CC BY 3.0
// (https://creativecommons.org/licenses/by/3.0/). Trimmed and faded; file in public/sfx.
//
// Browsers, iPhone Safari especially, only allow sound after a tap, so call unlockSfx()
// from a click handler before the first playSlapshot(). Played through Web Audio so it can
// fire later (between clips) without another tap. The iPhone silent switch mutes it.

type AC = typeof AudioContext;
let ctx: AudioContext | null = null;
let slapshot: AudioBuffer | null = null;
let loading: Promise<void> | null = null;

function loadSlapshot(c: AudioContext) {
  if (slapshot || loading) return;
  loading = fetch("/sfx/slapshot.mp3")
    .then((r) => r.arrayBuffer())
    .then((data) => c.decodeAudioData(data))
    .then((buf) => {
      slapshot = buf;
    })
    .catch(() => {
      loading = null;
    });
}

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
  loadSlapshot(ctx);
}

export function playSlapshot() {
  const c = ctx;
  if (!c || !slapshot || c.state !== "running") return;
  const src = c.createBufferSource();
  src.buffer = slapshot;
  const gain = c.createGain();
  gain.gain.value = 0.9;
  src.connect(gain).connect(c.destination);
  src.start();
}

// A short two-note chime for in-app alerts (synthesized, no audio file).
export function playChime() {
  const c = ctx;
  if (!c || c.state !== "running") return;
  const t = c.currentTime + 0.02;
  const notes: Array<[number, number]> = [
    [1046.5, 0],
    [1568, 0.13],
  ];
  for (const [freq, at] of notes) {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t + at);
    g.gain.exponentialRampToValueAtTime(0.22, t + at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.32);
    osc.connect(g).connect(c.destination);
    osc.start(t + at);
    osc.stop(t + at + 0.35);
  }
}

// Alert sound preference (per device). Stored locally; defaults to on.
const SOUND_KEY = "sicko:alert-sound";
const SOUND_EVENT = "sicko:alert-sound-change";

export function alertSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAlertSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* private mode: preference just won't persist */
  }
  window.dispatchEvent(new Event(SOUND_EVENT));
}

export function subscribeAlertSound(cb: () => void) {
  window.addEventListener(SOUND_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SOUND_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
