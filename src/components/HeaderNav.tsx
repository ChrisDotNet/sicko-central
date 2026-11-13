"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { NAV_ITEMS, isActive } from "./BottomNav";

// Desktop only: the main menu sits in the header instead of the bottom bar.
function Links({ path }: { path: string | null }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = path ? isActive(path, item.href) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-1.5 px-3.5 text-sm font-semibold ${
              active ? "text-ink shadow-[inset_0_-2px_0_#e23a4c]" : "text-muted hover:text-ink"
            }`}
          >
            {item.href === "/live" && <span aria-hidden="true" className="size-1.5 rounded-full bg-sens-bright" />}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function Active() {
  return <Links path={usePathname()} />;
}

export function HeaderNav() {
  return (
    <nav aria-label="Main" className="hidden self-stretch lg:flex">
      <Suspense fallback={<Links path={null} />}>
        <Active />
      </Suspense>
    </nav>
  );
}
