"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { playSlapshot } from "@/lib/sfx";

// The NHL's Brightcove player, loaded in the page (not an iframe) so we can tell when
// a clip ends and start the next one. The player's own config carries the key it needs
// to look up clips, so any NHL highlight clip id can be loaded into it.
//
// iPhone Safari only lets a video start without a tap if it starts synchronously in the
// previous clip's "ended" event. So the next clip is fetched while the current one plays,
// and swapped in immediately when it ends.
const ACCOUNT = "6415718365001";
const PLAYER = "D3UCGynRWU";
const SCRIPT = `https://players.brightcove.net/${ACCOUNT}/${PLAYER}_default/index.min.js`;

type BcVideo = object;
type BcPlayer = {
  ready: (cb: () => void) => void;
  on: (event: string, cb: () => void) => void;
  play: () => Promise<void> | undefined;
  paused: () => boolean;
  dispose: () => void;
  catalog: {
    getVideo: (id: string, cb: (err: unknown, video: BcVideo) => void) => void;
    load: (video: BcVideo) => void;
  };
};

declare global {
  interface Window {
    bc?: (el: Element) => BcPlayer;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window !== "undefined" && window.bc) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("player failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// Start downloading the player before it's needed (e.g. when a play button is touched).
export function preloadClipPlayer() {
  loadScript().catch(() => {});
}

export type ClipPlayerHandle = { goTo: (index: number) => void };
export type ClipItem = { clipId: number; title: string; sub: string };

// Pause between clips in "watch all" mode, so each clip's audio finishes before the next starts.
const TRANSITION_SECS = 5;

export function ClipPlayer({
  items,
  start,
  autoAdvance,
  onIndex,
  onDone,
  onError,
  ref,
}: {
  items: ClipItem[];
  start: number;
  autoAdvance: boolean;
  onIndex: (index: number) => void;
  onDone: () => void;
  onError: () => void;
  ref?: Ref<ClipPlayerHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<BcPlayer | null>(null);
  const cache = useRef(new Map<number, BcVideo>());
  const idx = useRef(start);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [transition, setTransition] = useState<{ index: number; left: number } | null>(null);
  const clipIds = items.map((i) => i.clipId);
  const props = useRef({ clipIds, autoAdvance, onIndex, onDone, onError });

  useEffect(() => {
    props.current = { clipIds: items.map((i) => i.clipId), autoAdvance, onIndex, onDone, onError };
  }, [items, autoAdvance, onIndex, onDone, onError]);

  const clearStall = () => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    stallTimer.current = null;
  };

  const fetchVideo = (i: number): Promise<BcVideo | null> => {
    const id = props.current.clipIds[i];
    const p = player.current;
    if (id == null || !p) return Promise.resolve(null);
    const hit = cache.current.get(id);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve) => {
      p.catalog.getVideo(String(id), (err, video) => {
        if (err || !video) return resolve(null);
        cache.current.set(id, video);
        resolve(video);
      });
    });
  };

  // Swap a fetched clip into the player and start it. Synchronous, so it keeps the
  // browser's permission to autoplay when called from an "ended" event or a tap.
  const start_ = (i: number, video: BcVideo) => {
    const p = player.current;
    if (!p) return;
    idx.current = i;
    props.current.onIndex(i);
    p.catalog.load(video);
    clearStall();
    stallTimer.current = setTimeout(() => {
      if (player.current?.paused()) setNeedsTap(true);
    }, 3500);
    p.play()?.catch(() => setNeedsTap(true));
    // Get the next clip ready while this one plays.
    void fetchVideo(i + 1);
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= props.current.clipIds.length) return;
    setNeedsTap(false);
    setTransition(null);
    const cached = cache.current.get(props.current.clipIds[i]);
    if (cached) {
      start_(i, cached);
      return;
    }
    void fetchVideo(i).then((v) => (v ? start_(i, v) : props.current.onError()));
  };

  useImperativeHandle(ref, () => ({ goTo }));

  // Count down the "up next" card, then start the next clip.
  useEffect(() => {
    if (!transition) return;
    const id = setTimeout(() => {
      if (transition.left <= 1) goTo(transition.index);
      else setTransition({ ...transition, left: transition.left - 1 });
    }, 1000);
    return () => clearTimeout(id);
    // goTo only reads refs; re-running on each tick is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition]);

  const upNext = transition ? items[transition.index] : null;

  // Create the player once; the player library owns this element's DOM.
  useEffect(() => {
    let disposed = false;
    const host = box.current;
    if (!host) return;
    const el = document.createElement("video-js");
    el.setAttribute("data-account", ACCOUNT);
    el.setAttribute("data-player", PLAYER);
    el.setAttribute("data-embed", "default");
    el.setAttribute("controls", "");
    el.setAttribute("playsinline", "");
    el.className = "vjs-fluid";
    host.appendChild(el);

    loadScript()
      .then(() => {
        if (disposed || !window.bc) return;
        const p = window.bc(el);
        player.current = p;
        p.on("ended", () => {
          const next = idx.current + 1;
          if (props.current.autoAdvance && next < props.current.clipIds.length) {
            void fetchVideo(next);
            setTransition({ index: next, left: TRANSITION_SECS });
            playSlapshot();
          } else {
            props.current.onDone();
          }
        });
        const started = () => {
          clearStall();
          setNeedsTap(false);
        };
        p.on("playing", started);
        p.on("adstart", started);
        p.ready(() => {
          if (!disposed) goTo(idx.current);
        });
      })
      .catch(() => props.current.onError());

    return () => {
      disposed = true;
      clearStall();
      try {
        player.current?.dispose();
      } catch {
        /* already gone */
      }
      player.current = null;
      host.innerHTML = "";
    };
    // The player is created once per mount; later changes go through goTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full bg-black">
      <div ref={box} className="w-full" />
      {upNext && transition && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-ground px-6 text-center">
          <span aria-hidden="true" className="font-display text-[28px] font-extrabold leading-none tracking-wide">
            <span className="text-sens-bright">SICKO</span> <span className="text-ink">CENTRAL</span>
          </span>
          <span aria-hidden="true" className="h-0.5 w-12 rounded-full bg-gold" />
          <span className="text-xs font-bold uppercase tracking-widest text-gold-text">Up next in {transition.left}</span>
          <span className="font-display text-2xl font-extrabold leading-tight tracking-wide">{upNext.title}</span>
          <span className="text-sm text-muted">{upNext.sub}</span>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => goTo(transition.index)} className="min-h-11 rounded-xl bg-sens px-4 text-sm font-bold text-white">
              Play now
            </button>
            <button
              type="button"
              onClick={() => {
                setTransition(null);
                props.current.onDone();
              }}
              className="min-h-11 rounded-xl border border-line-strong px-4 text-sm font-semibold text-ink"
            >
              Stop here
            </button>
          </div>
        </div>
      )}
      {needsTap && !transition && (
        <button
          type="button"
          onClick={() => {
            setNeedsTap(false);
            player.current?.play()?.catch(() => setNeedsTap(true));
          }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-sens">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
          </span>
          <span className="text-sm font-semibold">Tap to play</span>
        </button>
      )}
    </div>
  );
}
