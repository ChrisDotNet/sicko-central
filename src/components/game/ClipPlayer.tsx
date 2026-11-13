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
        p.ready(() => {
          if (!disposed) setReady(true);
        });
      })
      .catch(() => callbacks.current.onError());

    return () => {
      disposed = true;
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
      // Browsers may block autoplay for the first clip; the player then shows its play button.
      p.play()?.catch(() => {});
    });
  }, [clipId, ready]);

  return <div ref={box} className="w-full bg-black" />;
}
