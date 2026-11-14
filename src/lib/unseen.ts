"use client";

// "New since you last looked" for a game's Media tab: the ids of every news story, video and
// radio segment seen while on the tab, kept on this phone per game (last 20 games).
import { useEffect, useMemo, useState } from "react";
import type { GameMedia } from "./media";
import type { Goal } from "./game";

const KEY = "sicko:media-seen";
type Seen = Record<string, string[]>;

function read(): Seen {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Seen;
  } catch {
    return {};
  }
}

function write(all: Seen) {
  try {
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - 20))) delete all[k];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* fine */
  }
}

// Every item on the Media tab, as stable ids.
export function mediaKeys(media: GameMedia | null, goals: Goal[]): string[] {
  if (!media) return [];
  const v = media.video;
  return [
    ...media.news.map((n) => `n:${n.url}`),
    ...[...v.recaps, ...v.condensed, ...v.highlights].map((x) => `v:${x.clipId}`),
    ...goals.filter((g) => g.clipId).map((g) => `v:${g.clipId}`),
    ...(v.tsn ?? []).map((x) => `t:${x.id}`),
    ...(v.sportsnet ?? []).map((x) => `s:${x.id}`),
    ...(v.senstv ?? []).map((x) => `y:${x.id}`),
    ...media.radio.map((r) => `r:${r.id}`),
  ];
}

// How many items haven't been seen; while `viewing`, everything counts as seen.
export function useUnseen(gameId: number, keys: string[], viewing: boolean): number {
  const [seen, setSeen] = useState<Set<string> | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setSeen(new Set(read()[String(gameId)] ?? [])), 0);
    return () => clearTimeout(id);
  }, [gameId]);
  const joined = keys.join("|");
  useEffect(() => {
    if (!viewing || !keys.length) return;
    const all = read();
    const merged = [...new Set([...(all[String(gameId)] ?? []), ...keys])];
    delete all[String(gameId)];
    all[String(gameId)] = merged; // most recent last
    write(all);
    const id = setTimeout(() => setSeen(new Set(merged)), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing, joined, gameId]);
  return useMemo(() => (seen ? keys.filter((k) => !seen.has(k)).length : 0), [seen, joined]); // eslint-disable-line react-hooks/exhaustive-deps
}
