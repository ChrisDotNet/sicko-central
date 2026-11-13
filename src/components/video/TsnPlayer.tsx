"use client";

import { useEffect, useRef, useState } from "react";
import { announceReplayEnd, announceReplayStart } from "@/lib/media-bus";

// TSN's video player (Bell Media's "Jasper" player), run in our page rather than through
// TSN's embed page. Same library and settings as TSN's own embed, ads included, but with
// TSN's "watch next" playlist, related videos and end screen turned off, and with events we
// can hear: when the video ends, the playlist moves on.
const VERSION = "20.0.0";
const SCRIPT = `https://lib.jasperplayer.com/${VERSION}/jasper.umd.production.min.js`;
const STYLES = `https://lib.jasperplayer.com/assets/styles/web/${VERSION}/jasper-styles.css`;

type JasperPlayer = {
  on: (event: string, cb: (e: { state?: string }) => void) => void;
  setPlaybackRequest: (r: { contentId: string; playbackLanguage: string }) => void;
  setUpNextDisabled: (disabled: boolean) => void;
  play: () => void;
  destroy: () => void;
};
type JasperLib = {
  GlobalConfigurator: { configure: () => void; setUILanguage: (l: string) => void };
  Player: new (opts: unknown) => JasperPlayer;
};

declare global {
  interface Window {
    Jasper?: JasperLib;
  }
}

let loading: Promise<JasperLib> | null = null;

function loadJasper(): Promise<JasperLib> {
  if (typeof window !== "undefined" && window.Jasper) return Promise.resolve(window.Jasper);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      if (!document.querySelector(`link[href="${STYLES}"]`)) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = STYLES;
        document.head.appendChild(l);
      }
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => {
        if (!window.Jasper) return reject(new Error("TSN player missing"));
        window.Jasper.GlobalConfigurator.configure();
        window.Jasper.GlobalConfigurator.setUILanguage("EN");
        resolve(window.Jasper);
      };
      s.onerror = () => {
        loading = null;
        reject(new Error("TSN player failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Start downloading the player (it's large) when a TSN video is about to be chosen.
export function preloadTsnPlayer() {
  loadJasper().catch(() => {});
}

// If the library won't load or won't start a video on this device, TSN's own embed page
// (in a frame) takes over: no auto-play there, but the video still plays.
const START_TIMEOUT_MS = 20_000;
const STARTED = new Set(["READY_TO_PLAY", "PLAYING", "PLAYING_AD", "PAUSED", "PAUSED_AD", "BUFFERING"]);

export function TsnPlayer({
  contentId,
  embedUrl,
  title,
  onEnded,
  onError,
}: {
  contentId: string;
  embedUrl: string;
  title: string;
  onEnded: () => void;
  onError: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const cbs = useRef({ onEnded, onError });
  useEffect(() => {
    cbs.current = { onEnded, onError };
  }, [onEnded, onError]);

  useEffect(() => {
    if (fallback) return;
    let player: JasperPlayer | null = null;
    let disposed = false;
    let ended = false;
    let started = false;
    const host = box.current;
    if (!host) return;
    const giveUp = () => {
      if (!disposed && !started) setFallback(true);
    };
    const timer = setTimeout(giveUp, START_TIMEOUT_MS);
    const el = document.createElement("div");
    el.style.width = "100%";
    el.style.height = "100%";
    host.appendChild(el);

    loadJasper()
      .then((J) => {
        if (disposed) return;
        player = new J.Player({
          container: el,
          backendConfiguration: { brand: "tsn", brandConfigurationEnvironment: "production", destination: "tsn_web" },
          brandConfigurationOverride: {
            playerConfiguration: {
              autoPlayStrategy: "always", // the viewer just chose this video
              watchNextEnabled: false,
              relatedContentEnabled: false,
              emptyEndScreenEnabled: true,
              upnext: { displayType: "disabled", relatedVideosAsNextContent: false },
            },
            advertisingConfiguration: {
              adUnit: { default: { attributes: { playerType: "embedded" } }, hierarchy: { attributes: { playerType: "embedded" } } },
            },
            analyticsConfiguration: { comscore: { enabled: false }, mparticle: { enabled: false }, permutive: { enabled: false }, newRelic: { enabled: false } },
          },
        });
        player.setUpNextDisabled(true);
        const finish = () => {
          if (ended || disposed) return;
          ended = true;
          announceReplayEnd();
          cbs.current.onEnded();
        };
        player.on("playerStateChanged", ({ state }) => {
          if (state && STARTED.has(state)) started = true;
          if (state === "PLAYING" || state === "PLAYING_AD") announceReplayStart();
          else if (state === "ENDED") finish();
          else if (state === "ERROR") {
            if (started) cbs.current.onError();
            else giveUp();
          }
        });
        player.on("playbackSessionEnded", finish);
        player.setPlaybackRequest({ contentId, playbackLanguage: "EN" });
      })
      .catch(giveUp);

    return () => {
      disposed = true;
      clearTimeout(timer);
      announceReplayEnd();
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      host.innerHTML = "";
    };
  }, [contentId, fallback]);

  if (fallback) {
    return (
      <iframe
        src={embedUrl}
        title={`${title} (TSN video)`}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        scrolling="no"
        className="absolute inset-0 size-full overflow-hidden border-0"
      />
    );
  }
  return <div ref={box} className="absolute inset-0 overflow-hidden bg-black" />;
}
