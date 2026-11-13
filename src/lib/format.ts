// Display helpers. All times are shown in Ottawa time.
const TZ = "America/Toronto";

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", timeZone: TZ })
    .format(new Date(iso))
    .replace("a.m.", "a.m.")
    .replace("p.m.", "p.m.");
}

export function formatDay(iso: string): { dow: string; day: number; month: string; long: string } {
  const d = new Date(iso);
  const part = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-CA", { ...opts, timeZone: TZ }).format(d);
  return {
    dow: part({ weekday: "short" }).toUpperCase().replace(".", ""),
    day: Number(part({ day: "numeric" })),
    month: part({ month: "long", year: "numeric" }),
    long: part({ weekday: "short", month: "short", day: "numeric" }),
  };
}

// "2026-11-10" (a game date) formatted without timezone shifts.
export function formatGameDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function periodLabel(n: number, type?: string): string {
  if (type === "SO") return "SO";
  if (type === "OT" || n > 3) return n > 4 ? `${n - 3}OT` : "OT";
  return ["1st", "2nd", "3rd"][n - 1] ?? `${n}th`;
}

export function seasonLabel(season: number | string): string {
  const s = String(season);
  return `${s.slice(0, 4)}–${s.slice(6, 8)}`;
}

export function heightLabel(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export function pct(n: number | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "–";
  return `${(n * 100).toFixed(digits)}%`;
}

export function savePct(n: number | undefined): string {
  if (n == null) return "–";
  return n.toFixed(3).replace(/^0/, "");
}

export function toiFromSeconds(sec: number): string {
  // Round the total first, so 1319.6 s is 22:00, not 21:60.
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
