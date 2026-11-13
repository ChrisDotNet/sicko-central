// Lets the goal replay player and the radio player stay out of each other's way:
// replays announce when they start and stop, and the radio pauses and resumes.
const START = "sicko:replay-start";
const END = "sicko:replay-end";

export function announceReplayStart() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(START));
}

export function announceReplayEnd() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(END));
}

export function onReplay(start: () => void, end: () => void): () => void {
  window.addEventListener(START, start);
  window.addEventListener(END, end);
  return () => {
    window.removeEventListener(START, start);
    window.removeEventListener(END, end);
  };
}

// Ask the live radio bar to open (e.g. the intermission card's "intermission show" button).
const OPEN_RADIO = "sicko:open-radio";

export function openLiveRadio() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_RADIO));
}

export function onOpenLiveRadio(cb: () => void): () => void {
  window.addEventListener(OPEN_RADIO, cb);
  return () => window.removeEventListener(OPEN_RADIO, cb);
}
