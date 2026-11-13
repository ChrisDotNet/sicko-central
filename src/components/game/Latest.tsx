"use client";

import Link from "next/link";
import type { LatestItem } from "./latest-items";

export function Latest({ items, all }: { items: LatestItem[]; all: { href?: string; onSelect?: () => void } }) {
  const row = "flex min-h-11 w-full flex-col gap-0.5 border-b border-line px-3.5 py-2.5 text-left last:border-0 hover:bg-surface-2";
  return (
    <section className="hidden px-4 pt-6 lg:block">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider">Latest</h2>
        {all.href ? (
          <Link href={all.href} className="text-xs font-semibold text-sens-text">All media</Link>
        ) : (
          <button type="button" onClick={all.onSelect} className="text-xs font-semibold text-sens-text">All media</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-3.5 text-sm text-muted">Stories and video show up here as they post.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {items.map((x) => {
            const body = (
              <>
                <span className="text-[11px] text-muted">{x.kind}</span>
                <span className="text-[13px] font-semibold leading-snug">{x.title}</span>
              </>
            );
            if (x.onSelect) return <button key={x.key} type="button" onClick={x.onSelect} className={row}>{body}</button>;
            if (x.external) return <a key={x.key} href={x.href} target="_blank" rel="noopener noreferrer" className={row}>{body}</a>;
            return <Link key={x.key} href={x.href ?? "#"} className={row}>{body}</Link>;
          })}
        </div>
      )}
    </section>
  );
}
