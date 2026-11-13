"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { alertSoundOn, playChime, unlockSfx } from "@/lib/sfx";

// App-wide notifications for time-sensitive content (a replay just posted, the recap is up,
// and whatever comes next). Any client component can call useNotify()(...).
//
//   notify({ key: "clip-123", title: "Replay ready", body: "Pinto goal", action: { label: "Watch", onSelect } })
//
// - `key` dedupes: the same key never shows twice in a visit.
// - Shows a toast under the header, plays a chime (unless turned off), and buzzes on Android.
// - Toasts dismiss themselves after DISMISS_MS; at most MAX_SHOWN at once.

export type NoticeAction = { label: string; onSelect: () => void };

export type Notice = {
  key: string;
  title: string;
  body?: string;
  tone?: "gold" | "neutral";
  action?: NoticeAction;
  sound?: boolean;
};

type Shown = Notice & { id: number };

const DISMISS_MS = 10_000;
const MAX_SHOWN = 3;

const NotifyContext = createContext<(n: Notice) => void>(() => {});

export function useNotify() {
  return useContext(NotifyContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown[]>([]);
  const seen = useRef(new Set<string>());
  const count = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  // Browsers only allow sound after a tap: unlock audio on any tap so alerts can chime later.
  useEffect(() => {
    const unlock = () => unlockSfx();
    window.addEventListener("pointerdown", unlock, { passive: true });
    const t = timers.current;
    return () => {
      window.removeEventListener("pointerdown", unlock);
      t.forEach(clearTimeout);
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setShown((list) => list.filter((n) => n.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (n: Notice) => {
      if (seen.current.has(n.key)) return;
      seen.current.add(n.key);
      count.current += 1;
      const id = count.current;
      setShown((list) => [...list, { ...n, id }].slice(-MAX_SHOWN));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DISMISS_MS),
      );
      if (n.sound !== false && alertSoundOn()) {
        playChime();
        try {
          navigator.vibrate?.(60);
        } catch {
          /* not supported */
        }
      }
    },
    [dismiss],
  );

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[60px] z-40 mx-auto flex max-w-xl flex-col gap-2 px-3 lg:inset-x-auto lg:right-6 lg:top-[72px] lg:w-[400px] lg:px-0"
      >
        {shown.map((n) => (
          <div
            key={n.id}
            role="status"
            className={`toast-in pointer-events-auto flex items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur ${
              n.tone === "neutral" ? "border-line-strong bg-surface/95" : "border-gold-line bg-gold-ground/95"
            }`}
          >
            <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full ${n.tone === "neutral" ? "bg-line text-ink" : "bg-gold text-ground"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{n.title}</div>
              {n.body && <div className="truncate text-xs text-muted">{n.body}</div>}
            </div>
            {n.action && (
              <button
                type="button"
                onClick={() => {
                  n.action?.onSelect();
                  dismiss(n.id);
                }}
                className="min-h-11 shrink-0 rounded-xl bg-sens px-3.5 text-sm font-bold text-white"
              >
                {n.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(n.id)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        ))}
      </div>
    </NotifyContext.Provider>
  );
}
