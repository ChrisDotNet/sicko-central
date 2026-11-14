"use client";

// The TSN 1200 live bar's state, shared across the whole site: the bar itself lives in the
// root layout, so the radio keeps playing while you move between pages.
// - offer: set by the Game page while a game is on (with a label); the bar shows "Listen".
// - mode: closed, open (full player) or small (one slim row, still playing).
import { useSyncExternalStore } from "react";

export type RadioMode = "closed" | "open" | "small";
type State = { mode: RadioMode; offer: string | null };

let state: State = { mode: "closed", offer: null };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function setRadioMode(mode: RadioMode) {
  if (state.mode === mode) return;
  state = { ...state, mode };
  emit();
}

// The Game page offers the radio while a game is on, and withdraws the offer when you leave;
// a full player then shrinks to its slim row and keeps playing.
export function setRadioOffer(offer: string | null) {
  if (state.offer === offer) return;
  state = { mode: offer === null && state.mode === "open" ? "small" : state.mode, offer };
  emit();
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}
const SERVER: State = { mode: "closed", offer: null };

export function useRadio(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}
