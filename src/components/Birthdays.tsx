"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Player birthdays, worked out in the browser so "today" is always today in Ottawa,
// whatever the page cache holds. Birth dates come from the NHL roster and player feeds.

const TZ = "America/Toronto";

export type BirthdayPlayer = { id: number; name: string; birthDate: string; number?: number };

// Today in Ottawa as YYYY-MM-DD, or null until the page has loaded (and with ?today=…
// for testing).
function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("today");
    const t = forced && /^\d{4}-\d{2}-\d{2}$/.test(forced) ? forced : new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
    const id = setTimeout(() => setToday(t), 0);
    return () => clearTimeout(id);
  }, []);
  return today;
}

const parse = (d: string) => d.split("-").map(Number) as [number, number, number];
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

// Days until the next birthday (0 = today) and the age it brings.
export function nextBirthday(birthDate: string, today: string): { days: number; age: number; date: number } {
  const [by, bm, bd] = parse(birthDate);
  const [ty, tm, td] = parse(today);
  const now = utc(ty, tm, td);
  let year = ty;
  // Feb 29 birthdays fall on Feb 28 in other years.
  const day = (y: number) => (bm === 2 && bd === 29 && new Date(utc(y, 3, 0)).getUTCDate() === 28 ? 28 : bd);
  let next = utc(year, bm, day(year));
  if (next < now) {
    year += 1;
    next = utc(year, bm, day(year));
  }
  return { days: Math.round((next - now) / 86400_000), age: year - by, date: next };
}

const weekday = (ms: number) => new Intl.DateTimeFormat("en-CA", { weekday: "long", timeZone: "UTC" }).format(new Date(ms));

const Cake = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
    <path d="M4 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 1.5-.5 2.5-.5" />
    <path d="M2 21h20M8 12V9M12 12V9M16 12V9" />
    <path d="M8 6.5a1 1 0 0 0 0-2.5M12 6.5a1 1 0 0 0 0-2.5M16 6.5a1 1 0 0 0 0-2.5" />
  </svg>
);

// Home page: a gold banner for anyone whose birthday is today; otherwise a quiet line for
// birthdays in the next week. Nothing at all if neither.
export function BirthdayBanner({ players, className = "" }: { players: BirthdayPlayer[]; className?: string }) {
  const today = useToday();
  if (!today) return null;
  const withNext = players.map((p) => ({ p, ...nextBirthday(p.birthDate, today) })).sort((a, b) => a.days - b.days);
  const now = withNext.filter((x) => x.days === 0);
  const soon = withNext.filter((x) => x.days > 0 && x.days <= 7);

  if (now.length > 0) {
    return (
      <section className={`px-4 pt-4 ${className}`}>
        <div className="flex flex-col gap-2 rounded-2xl border border-gold-line bg-gold-ground px-4 py-3">
          {now.map(({ p, age }) => (
            <Link key={p.id} href={`/player/${p.id}`} className="flex min-h-11 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold text-ground">
                <Cake />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-xl font-extrabold leading-tight tracking-wide">Happy birthday, {p.name}!</span>
                <span className="text-sm text-ink-2">
                  {p.number != null ? `#${p.number} · ` : ""}
                  {age} today
                </span>
              </span>
              <span aria-hidden="true" className="text-gold-text">›</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  if (soon.length > 0) {
    return (
      <section className={`px-4 pt-3 ${className}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="text-gold-text">
            <Cake size={15} />
          </span>
          {soon.map(({ p, age, days, date }, i) => (
            <span key={p.id}>
              {i > 0 && " · "}
              <Link href={`/player/${p.id}`} className="font-semibold text-ink-2 hover:text-ink">
                {p.name}
              </Link>{" "}
              turns {age} {days === 1 ? "tomorrow" : weekday(date)}
            </span>
          ))}
        </div>
      </section>
    );
  }
  return null;
}

// Player page header: a "Birthday today" chip next to Follow, on the day.
export function BirthdayBadge({ birthDate }: { birthDate?: string }) {
  const today = useToday();
  if (!birthDate || !today) return null;
  const { days, age } = nextBirthday(birthDate, today);
  if (days !== 0) return null;
  return (
    <span className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-gold-line bg-gold-ground px-3 text-sm font-bold text-gold-text">
      <Cake size={15} /> {age} today
    </span>
  );
}

// Player page: age next to the birth date, and a note in the week before a birthday.
export function PlayerBirthday({ birthDate, label }: { birthDate?: string; label: string }) {
  const today = useToday();
  if (!birthDate) return <>–</>;
  if (!today) return <>{label}</>;
  const { days, age, date } = nextBirthday(birthDate, today);
  const current = days === 0 ? age : age - 1;
  return (
    <>
      {label} <span className="font-normal text-muted">({current})</span>
      {days > 0 && days <= 7 && (
        <span className="mt-1 block text-xs font-normal text-gold-text">
          Turns {age} {days === 1 ? "tomorrow" : weekday(date)}
        </span>
      )}
    </>
  );
}
