"use client";

// Players you follow, saved on this device (no account). Shared by every star button and
// highlight on the page through one small store.
import { useSyncExternalStore } from "react";

const KEY = "sicko:favourites";
const EVENT = "sicko:favourites";
const EMPTY: ReadonlySet<number> = new Set();

let cache: { raw: string | null; set: ReadonlySet<number> } = { raw: null, set: EMPTY };

function read(): ReadonlySet<number> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.set;
  let ids: number[] = [];
  try {
    ids = raw ? (JSON.parse(raw) as number[]).filter((x) => typeof x === "number") : [];
  } catch {
    ids = [];
  }
  cache = { raw, set: new Set(ids) };
  return cache.set;
}

export function getFavourites(): ReadonlySet<number> {
  return typeof window === "undefined" ? EMPTY : read();
}

export function toggleFavourite(id: number) {
  const next = new Set(read());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* private mode: won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useFavourites(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
