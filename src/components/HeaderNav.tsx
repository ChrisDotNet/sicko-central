"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useGameStatus } from "@/lib/game-status";
import type { GameStatus } from "@/lib/game-status";
import { NAV_ITEMS, isActive } from "./BottomNav";

// The header has room for one more than the bottom bar: News (desktop only).
const ITEMS = [...NAV_ITEMS.map(({ href, label }) => ({ href, label })), { href: "/news", label: "News" }];

const score = (s: Extract<GameStatus, { opp: string }>) => `OTT ${s.ottScore} – ${s.oppScore} ${s.opp}`;

// Desktop only: the main menu sits in the header instead of the bottom bar. During a game
// the Game tab becomes a red LIVE pill with the score.
function Links({ path, status }: { path: string | null; status: GameStatus }) {
  return (
    <>
      {ITEMS.map((item) => {
        const active = path ? isActive(path, item.href) : false;
        const game = item.href === "/live";
        if (game && status.state === "live") {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="mx-1.5 flex items-center gap-2 self-center rounded-full bg-sens px-3.5 py-1.5 text-sm font-bold text-white hover:bg-sens-bright"
            >
              <span aria-hidden="true" className="relative flex size-2">
                <span className="live-ring absolute inset-0 rounded-full bg-white" />
                <span className="relative size-2 rounded-full bg-white" />
              </span>
              LIVE <span className="font-display text-base tracking-wide">{score(status)}</span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-1.5 px-3.5 text-sm font-semibold ${
              active ? "text-ink shadow-[inset_0_-2px_0_var(--sens-bright)]" : "text-muted hover:text-ink"
            }`}
          >
            {game && status.state === "pre" && <span aria-hidden="true" className="size-1.5 rounded-full bg-gold-bright" />}
            {item.label}
            {game && status.state === "pre" && <span className="text-xs font-semibold text-gold-text">Tonight</span>}
          </Link>
        );
      })}
    </>
  );
}

function Active() {
  return <Links path={usePathname()} status={useGameStatus()} />;
}

export function HeaderNav() {
  return (
    <nav aria-label="Main" className="hidden self-stretch lg:flex">
      <Suspense fallback={<Links path={null} status={{ state: "none" }} />}>
        <Active />
      </Suspense>
    </nav>
  );
}

// Phones and tablets: a slim red strip under the header while a game is on, on every page
// except the game itself, so the score is never more than a glance away.
function Strip() {
  const path = usePathname();
  const status = useGameStatus();
  if (status.state !== "live" || path.startsWith("/live") || path.startsWith("/game")) return null;
  return (
    <Link href="/live" className="flex min-h-10 items-center justify-center gap-2 bg-sens px-4 text-sm font-bold text-white lg:hidden">
      <span aria-hidden="true" className="relative flex size-2">
        <span className="live-ring absolute inset-0 rounded-full bg-white" />
        <span className="relative size-2 rounded-full bg-white" />
      </span>
      LIVE <span className="font-display text-base tracking-wide">{score(status)}</span>
      <span className="font-semibold opacity-80">· Follow</span>
    </Link>
  );
}

export function LiveStrip() {
  return (
    <Suspense fallback={null}>
      <Strip />
    </Suspense>
  );
}
