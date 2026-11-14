"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type MenuLink = { label: string; note?: string; href: string | null };

// A button that opens a small list of outside links (the next-game card's Streaming and
// Tickets). Closes on a second tap, a tap anywhere else, or Escape.
export function LinkMenu({
  label,
  icon,
  items,
  align = "left",
  tone = "plain",
  size = "md",
  iconOnlyBelowLg = false,
}: {
  label: string;
  icon: ReactNode;
  items: MenuLink[];
  align?: "left" | "right";
  tone?: "plain" | "gold";
  size?: "md" | "sm";
  // Narrow spots (the tablet calendar): just the icon until desktop widths.
  iconOnlyBelowLg?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Opens upward when there isn't room below (near the bottom bar on phones).
  const [up, setUp] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  if (items.length === 0) return null;

  const colours =
    tone === "gold"
      ? open
        ? "border-gold bg-gold-ground text-gold-text"
        : "border-gold-line text-gold-text"
      : open
        ? "border-ink-2 bg-surface-2 text-ink"
        : "border-line-strong bg-surface-2 text-ink";
  const row = "flex min-h-11 items-center justify-between gap-6 border-b border-line px-3.5 text-sm font-semibold last:border-0";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (!open && box.current) {
            const r = box.current.getBoundingClientRect();
            const room = window.innerHeight - r.bottom - 96; // keep clear of the bottom bar
            setUp(room < items.length * 46 + 16 && r.top > room);
          }
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-bold ${size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-9 px-3 text-sm"} ${colours}`}
      >
        {icon}
        {iconOnlyBelowLg ? <span className="sr-only lg:not-sr-only">{label}</span> : label}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={open ? "rotate-180" : ""}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 min-w-52 ${up ? "bottom-full mb-1.5" : "top-full mt-1.5"} overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.6)] ${align === "right" ? "right-0" : "left-0"}`}
        >
          {items.map((it) =>
            it.href ? (
              <a key={it.label} role="menuitem" href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={`${row} hover:bg-surface-2`}>
                {it.label}
                {it.note && <span className="text-xs font-medium text-muted">{it.note} ↗</span>}
              </a>
            ) : (
              <span key={it.label} role="menuitem" aria-disabled="true" className={`${row} text-muted`}>
                {it.label}
                {it.note && <span className="text-xs font-medium">{it.note}</span>}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export const TicketIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
    <path d="M14 6v2M14 11v2M14 16v2" />
  </svg>
);

export const TvIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="12" rx="2" />
    <path d="M8 21h8" />
  </svg>
);
