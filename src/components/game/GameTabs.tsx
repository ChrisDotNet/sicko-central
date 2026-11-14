import Link from "next/link";

export type GameTab = "summary" | "media";

export const TAB_LABELS: Record<GameTab, string> = { summary: "Summary", media: "Media" };

const ICONS: Record<GameTab, React.ReactNode> = {
  // Scoreboard-style bars for the game itself.
  summary: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  // A play button for video, news and audio.
  media: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="M10 9.2v5.6l4.6-2.8z" fill="currentColor" />
    </svg>
  ),
};

function Label({ t, text, badge }: { t: GameTab; text: string; badge?: number }) {
  return (
    <>
      {ICONS[t]}
      <span>{text}</span>
      {badge ? (
        <span className="min-w-5 rounded-full bg-sens px-1.5 text-center text-[11px] font-bold leading-5 text-white" aria-label={`${badge} new`}>
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </>
  );
}

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
  `flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 text-sm font-semibold lg:flex-none lg:px-6 ${
    active ? "border-sens-bright text-ink" : "border-transparent text-muted"
  }`;

// Link tabs for a server-rendered page (the recap page): each tab is its own URL.
export function GameTabLinks({ base, active }: { base: string; active: GameTab }) {
  return (
    <nav aria-label="Game sections" className="mt-4 flex border-b border-line px-2 lg:mx-4 lg:px-0">
      {(Object.keys(TAB_LABELS) as GameTab[]).map((t) => (
        <Link
          key={t}
          href={t === "summary" ? base : `${base}?tab=${t}`}
          replace
          scroll={false}
          aria-current={t === active ? "page" : undefined}
          className={tabClass(t === active)}
        >
          <Label t={t} text={TAB_LABELS[t]} />
        </Link>
      ))}
    </nav>
  );
}

// Button tabs for the live page, which keeps its state client-side while polling.
// `badges`: a count of new items (Media: news, video and audio not seen yet).
export function GameTabButtons({
  active,
  onChange,
  labels,
  badges,
}: {
  active: GameTab;
  onChange: (t: GameTab) => void;
  labels?: Partial<Record<GameTab, string>>;
  badges?: Partial<Record<GameTab, number>>;
}) {
  return (
    <div role="tablist" aria-label="Game sections" className="mt-3 flex border-b border-line px-2 lg:mx-4 lg:mt-4 lg:px-0">
      {(Object.keys(TAB_LABELS) as GameTab[]).map((t) => (
        <button key={t} type="button" role="tab" aria-selected={t === active} onClick={() => onChange(t)} className={tabClass(t === active)}>
          <Label t={t} text={labels?.[t] ?? TAB_LABELS[t]} badge={t === active ? 0 : badges?.[t]} />
        </button>
      ))}
    </div>
  );
}
