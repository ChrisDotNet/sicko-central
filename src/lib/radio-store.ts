"use client";

// The TSN 1200 strip's state, shared across the whole site: the strip lives in the root
// layout, so the radio keeps playing while you move between pages.
// - offer: set by the Game page while a game is on (with a label); the strip shows there.
// - started: someone has pressed play, so the strip follows them to every page until closed.
import { useSyncExternalStore } from "react";

type State = { offer: string | null; started: boolean };

let state: State = { offer: null, started: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function set(next: Partial<State>) {
  const merged = { ...state, ...next };
  if (merged.offer === state.offer && merged.started === state.started) return;
  state = merged;
  emit();
}

export const setRadioOffer = (offer: string | null) => set({ offer });
export const setRadioStarted = (started: boolean) => set({ started });

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}
const SERVER: State = { offer: null, started: false };

export function useRadio(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}
