"use client";

import { useEffect, useRef } from "react";
import { announceReplayEnd, announceReplayStart } from "@/lib/media-bus";

// Sens TV videos (the club's YouTube channel) in YouTube's own player, in our page, through
// YouTube's IFrame Player API: privacy-enhanced (youtube-nocookie.com), no related videos
// from other channels at the end, and it tells us when a video ends so auto-play moves on.

type YTPlayer = { destroy: () => void; playVideo: () => void };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTNamespace> | null = null;

function loadYouTube(): Promise<YTNamespace> {
  if (typeof window !== "undefined" && window.YT?.Player) return Promise.resolve(window.YT);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        if (window.YT) resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        loading = null;
        reject(new Error("YouTube player failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export function preloadYouTube() {
  loadYouTube().catch(() => {});
}

export function YouTubePlayer({ videoId, onEnded, onError }: { videoId: string; onEnded: () => void; onError: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const cbs = useRef({ onEnded, onError });
  useEffect(() => {
    cbs.current = { onEnded, onError };
  }, [onEnded, onError]);

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    let player: YTPlayer | null = null;
    let disposed = false;
    const el = document.createElement("div");
    host.appendChild(el);
    loadYouTube()
      .then((YT) => {
        if (disposed) return;
        player = new YT.Player(el, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e) => e.target.playVideo(),
            onStateChange: (e) => {
              if (e.data === 1) announceReplayStart();
              else if (e.data === 0) {
                announceReplayEnd();
                cbs.current.onEnded();
              }
            },
            // 101/150: the owner doesn't allow playing it on other sites.
            onError: () => cbs.current.onError(),
          },
        });
      })
      .catch(() => cbs.current.onError());
    return () => {
      disposed = true;
      announceReplayEnd();
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      host.innerHTML = "";
    };
  }, [videoId]);

  return <div ref={box} className="absolute inset-0 overflow-hidden bg-black [&>iframe]:size-full" />;
}
