import Link from "next/link";

export type GameTab = "summary" | "media";

export const TAB_LABELS: Record<GameTab, string> = { summary: "Summary", media: "Media" };

// "video" and "radio" are from older links, before those tabs moved under Media.
export function parseTab(v: unknown): GameTab {
  return v === "media" || v === "video" || v === "radio" ? "media" : "summary";
}

export type MediaSegment = "news" | "video" | "audio";

export const SEGMENTS: Array<{ id: MediaSegment; label: string }> = [
  { id: "news", label: "News" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
];

export function parseSegment(show: unknown, tab: unknown): MediaSegment {
  if (show === "news" || show === "video" || show === "audio") return show;
  // Older links: ?tab=video and ?tab=radio.
  if (tab === "video") return "video";
  if (tab === "radio") return "audio";
  return "news";
}

const tabClass = (active: boolean) =>
  `flex min-h-11 flex-1 items-center justify-center border-b-2 text-sm font-semibold ${
    active ? "border-sens-bright text-ink" : "border-transparent text-muted"
  }`;

// Link tabs for a server-rendered page (the recap page): each tab is its own URL.
export function GameTabLinks({ base, active }: { base: string; active: GameTab }) {
  return (
    <nav aria-label="Game sections" className="mt-4 flex border-b border-line px-2">
      {(Object.keys(TAB_LABELS) as GameTab[]).map((t) => (
        <Link
          key={t}
          href={t === "summary" ? base : `${base}?tab=${t}`}
          replace
          scroll={false}
          aria-current={t === active ? "page" : undefined}
          className={tabClass(t === active)}
        >
          {TAB_LABELS[t]}
        </Link>
      ))}
    </nav>
  );
}

// Button tabs for the live page, which keeps its state client-side while polling.
export function GameTabButtons({ active, onChange, labels }: { active: GameTab; onChange: (t: GameTab) => void; labels?: Partial<Record<GameTab, string>> }) {
  return (
    <div role="tablist" aria-label="Game sections" className="mt-3 flex border-b border-line px-2">
      {(Object.keys(TAB_LABELS) as GameTab[]).map((t) => (
        <button key={t} type="button" role="tab" aria-selected={t === active} onClick={() => onChange(t)} className={tabClass(t === active)}>
          {labels?.[t] ?? TAB_LABELS[t]}
        </button>
      ))}
    </div>
  );
}
