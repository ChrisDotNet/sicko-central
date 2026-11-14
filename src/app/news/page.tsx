import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Section } from "@/components/ui";
import { SensNewsList } from "@/components/news/SensNewsList";
import { formatDay } from "@/lib/format";
import type { NewsItem, Outlet } from "@/lib/news";
import { getSchedule } from "@/lib/nhl";
import { splitSchedule } from "@/lib/schedule";
import { getSensNews } from "@/lib/sens-news";

export const metadata: Metadata = { title: "News" };

const OUTLETS: Outlet[] = ["NHL.com", "TSN", "Sportsnet", "Sens TV"];
const TZ = "America/Toronto";

// "2026-11-13" in Ottawa time, for grouping by day.
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

function dayTitle(key: string, iso: string) {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400_000).toISOString());
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return formatDay(iso).long;
}

async function NewsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const outlet = OUTLETS.find((o) => o === sp.outlet) ?? null;
  const [news, schedule] = await Promise.all([getSensNews(), getSchedule().catch(() => null)]);
  const games = schedule ? splitSchedule(schedule.games).all : [];
  const shown = outlet ? news.filter((n) => n.outlet === outlet) : news;

  const days: Array<{ key: string; title: string; items: NewsItem[] }> = [];
  for (const n of shown) {
    const key = dayKey(n.published);
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(n);
    else days.push({ key, title: dayTitle(key, n.published), items: [n] });
  }

  const chip = (label: string, href: string, on: boolean) => (
    <Link
      key={label}
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold ${
        on ? "border-ink bg-ink text-ground" : "border-line-strong text-ink-2 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <div className="px-4 pt-5">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">Sens news</h1>
        <p className="mt-1 text-sm text-muted">Headlines and short summaries from NHL.com, TSN and Sportsnet, plus the club&apos;s YouTube videos (Sens TV). Full articles and videos open on their site.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {chip("All", "/news", !outlet)}
          {OUTLETS.map((o) => chip(o, `/news?outlet=${encodeURIComponent(o)}`, outlet === o))}
        </div>
      </div>
      {days.length === 0 && <p className="px-4 pt-6 text-sm text-muted">No stories right now. Try again in a few minutes.</p>}
      {days.map((d, i) => (
        <Section key={d.key} title={d.title} aside={`${d.items.length} ${d.items.length === 1 ? "story" : "stories"}`}>
          {/* The newest day leads with a featured story and two medium cards. */}
          <SensNewsList items={d.items} games={games} wide feature={i === 0} />
        </Section>
      ))}
    </>
  );
}

export default function NewsPage(props: PageProps<"/news">) {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-sm text-muted">Loading the news…</div>}>
      <NewsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
