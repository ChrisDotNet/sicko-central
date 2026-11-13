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
