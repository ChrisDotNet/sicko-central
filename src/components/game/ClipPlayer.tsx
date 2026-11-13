"use client";

import { useEffect, useRef, useState } from "react";

// The NHL's Brightcove player, loaded in the page (not an iframe) so we can tell when
// a clip ends and start the next one. The player's own config carries the key it needs
// to look up clips, so any NHL highlight clip id can be loaded into it.
const ACCOUNT = "6415718365001";
const PLAYER = "D3UCGynRWU";
const SCRIPT = `https://players.brightcove.net/${ACCOUNT}/${PLAYER}_default/index.min.js`;

type BcVideo = unknown;
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

export function ClipPlayer({
  clipId,
  onEnded,
  onError,
}: {
  clipId: number;
  onEnded: () => void;
  onError: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<BcPlayer | null>(null);
  const callbacks = useRef({ onEnded, onError });
  const [ready, setReady] = useState(false);
  // Phones sometimes refuse to start the next clip on their own (autoplay rules, or an ad
  // that needs a tap). If a clip hasn't started a few seconds after loading, offer one big tap.
  const [needsTap, setNeedsTap] = useState(false);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearStall = () => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    stallTimer.current = null;
  };

  useEffect(() => {
    callbacks.current = { onEnded, onError };
  }, [onEnded, onError]);

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
        p.on("ended", () => callbacks.current.onEnded());
        const started = () => {
          clearStall();
          setNeedsTap(false);
        };
        p.on("playing", started);
        p.on("adstart", started);
        p.ready(() => {
          if (!disposed) setReady(true);
        });
      })
      .catch(() => callbacks.current.onError());

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
  }, []);

  // Load (and start) a clip whenever the id changes.
  useEffect(() => {
    const p = player.current;
    if (!ready || !p) return;
    p.catalog.getVideo(String(clipId), (err, video) => {
      if (err || !video) {
        callbacks.current.onError();
        return;
      }
      p.catalog.load(video);
      clearStall();
      stallTimer.current = setTimeout(() => {
        if (player.current?.paused()) setNeedsTap(true);
      }, 3500);
      p.play()?.catch(() => setNeedsTap(true));
    });
    return clearStall;
  }, [clipId, ready]);

  return (
    <div className="relative w-full bg-black">
      <div ref={box} className="w-full" />
      {needsTap && (
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
