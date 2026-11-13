"use client";

import { useSyncExternalStore } from "react";

// "Add Sicko Central to your Home Screen", on the home page. Three cases:
// - Android and desktop Chrome/Edge: the browser offers an install prompt; our button opens it.
// - iPhone/iPad: there's no prompt to trigger, so we show the two steps (Share, Add to Home Screen).
// - Already installed, dismissed in the last 30 days, or a browser that can't install: nothing.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "sicko:install-dismissed";
const DAY = 86_400_000;
const EVENT = "sicko:install-state";

let deferred: InstallEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep the browser's own mini-bar; we show our card instead
    deferred = e as InstallEvent;
    window.dispatchEvent(new Event(EVENT));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    window.dispatchEvent(new Event(EVENT));
  });
}

type Mode = "none" | "prompt" | "ios";

function mode(): Mode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) return "none";
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (at && Date.now() - at < 30 * DAY) return "none";
  } catch {
    /* ignore */
  }
  if (deferred) return "prompt";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "none";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share" role="img" className="inline -mt-0.5">
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);

export function InstallPrompt() {
  const m = useSyncExternalStore(subscribe, mode, () => "none" as Mode);
  if (m === "none") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  const install = async () => {
    const e = deferred;
    if (!e) return;
    await e.prompt();
    await e.userChoice.catch(() => null);
    deferred = null;
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <section className="px-4 pt-4">
      <div className="flex items-start gap-3 rounded-2xl border border-line-strong bg-surface p-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
        <img src="/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Put Sicko Central on your Home Screen</div>
          {m === "ios" ? (
            <p className="mt-0.5 text-[13px] leading-snug text-ink-2">
              It opens full screen like an app, ready for game night. In Safari, tap <ShareIcon /> Share, then <b>Add to Home Screen</b>.
            </p>
          ) : (
            <p className="mt-0.5 text-[13px] leading-snug text-ink-2">It opens full screen like an app, ready for game night.</p>
          )}
          <div className="mt-2.5 flex gap-2">
            {m === "prompt" && (
              <button type="button" onClick={install} className="min-h-10 rounded-xl bg-sens px-4 text-sm font-bold text-white">
                Install
              </button>
            )}
            <button type="button" onClick={dismiss} className="min-h-10 rounded-xl border border-line-strong px-4 text-sm font-semibold text-ink-2">
              Not now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
