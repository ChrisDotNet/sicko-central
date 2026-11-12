"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const items = [
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
    label: "Live",
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

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/live") return path.startsWith("/live") || path.startsWith("/game");
  if (href === "/roster") return path.startsWith("/roster") || path.startsWith("/player");
  return path.startsWith(href);
}

function NavLinks({ path }: { path: string | null }) {
  return (
    <div className="grid grid-cols-5 px-1 pt-1.5 pb-[max(18px,env(safe-area-inset-bottom))]">
      {items.map((item) => {
        const active = path ? isActive(path, item.href) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] ${
              active ? "font-bold text-sens-text" : "font-medium text-muted"
            }`}
          >
            <svg
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
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function ActiveNav() {
  const path = usePathname();
  return <NavLinks path={path} />;
}

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-line bg-[#111113]/95 backdrop-blur"
    >
      <Suspense fallback={<NavLinks path={null} />}>
        <ActiveNav />
      </Suspense>
    </nav>
  );
}
