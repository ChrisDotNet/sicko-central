"use client";

// Today's Sens game status for the menus, shared by every component that asks: one poll
// of /api/status for the whole page, every 30 s during a game and every 2 minutes
// otherwise, paused while the tab is hidden.
import { useSyncExternalStore } from "react";

export type GameStatus =
  | { state: "none" }
  | { state: "pre" | "live" | "final"; opp: string; home: boolean; ottScore: number; oppScore: number; startTimeUTC: string };

const NONE: GameStatus = { state: "none" };
let current: GameStatus = NONE;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function poll() {
  timer = null;
  if (document.visibilityState === "visible") {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const next = (await res.json()) as GameStatus;
        if (JSON.stringify(next) !== JSON.stringify(current)) {
          current = next;
          listeners.forEach((l) => l());
        }
      }
    } catch {
      /* keep the last answer */
    }
  }
  if (listeners.size > 0) timer = setTimeout(poll, current.state === "live" ? 30_000 : 120_000);
}

function onVisible() {
  if (document.visibilityState === "visible" && listeners.size > 0) {
    if (timer) clearTimeout(timer);
    void poll();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisible);
    if (!timer) timer = setTimeout(poll, 0);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
}

export function useGameStatus(): GameStatus {
  return useSyncExternalStore(subscribe, () => current, () => NONE);
}
