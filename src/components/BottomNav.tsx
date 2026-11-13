"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useGameStatus } from "@/lib/game-status";
import type { GameStatus } from "@/lib/game-status";

export const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
  },
  {
    href: "/live",
    label: "Game",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" />
      </>
    ),
  },
  {
    href: "/roster",
    label: "Roster",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 14c2 .6 3 2.5 3 5" />
      </>
    ),
  },
  { href: "/standings", label: "Standings", icon: <path d="M5 20V10M12 20V4M19 20v-7" /> },
];

export function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/live") return path.startsWith("/live") || path.startsWith("/game");
  if (href === "/roster") return path.startsWith("/roster") || path.startsWith("/player");
  return path.startsWith(href);
}

function NavLinks({ path, status }: { path: string | null; status: GameStatus }) {
  return (
    <div className="grid grid-cols-5 px-1 pt-1.5 pb-[max(18px,env(safe-area-inset-bottom))]">
      {NAV_ITEMS.map((item) => {
        const active = path ? isActive(path, item.href) : false;
        const game = item.href === "/live";
        const live = game && status.state === "live";
        const today = game && status.state === "pre";
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] ${
              active || live ? "font-bold text-sens-text" : "font-medium text-muted"
            }`}
          >
            <span className={`relative flex items-center justify-center ${live ? "rounded-full bg-sens px-2.5 py-0.5 text-white" : ""}`}>
            {live && <span aria-hidden="true" className="live-ring absolute inset-0 rounded-full bg-sens" />}
            <svg
              className="relative"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {item.icon}
            </svg>
            {today && <span aria-hidden="true" className="absolute -top-0.5 -right-1.5 size-2 rounded-full bg-gold-bright ring-2 ring-[#111113]" />}
            </span>
            {live ? "LIVE" : item.label}
            {today && <span className="sr-only"> (game today)</span>}
          </Link>
        );
      })}
    </div>
  );
}

function ActiveNav() {
  const path = usePathname();
  return <NavLinks path={path} status={useGameStatus()} />;
}

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-line bg-[#111113]/95 backdrop-blur md:max-w-4xl lg:hidden"
    >
      <Suspense fallback={<NavLinks path={null} status={{ state: "none" }} />}>
        <ActiveNav />
      </Suspense>
    </nav>
  );
}
