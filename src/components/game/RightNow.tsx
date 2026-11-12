import type { Context } from "@/lib/context";

const TONES = {
  gold: { box: "border-gold-line bg-gold-ground", kicker: "text-gold-text" },
  red: { box: "border-[#5C1A22] bg-[#1F0E11]", kicker: "text-sens-text" },
  neutral: { box: "border-line-strong bg-surface", kicker: "text-ink-2" },
} as const;

export function RightNow({ ctx }: { ctx: Context }) {
  const tone = TONES[ctx.tone];
  return (
    <div className={`rounded-2xl border p-4 ${tone.box}`} aria-live="polite">
      <div className={`text-xs font-bold uppercase tracking-widest ${tone.kicker}`}>{ctx.kicker}</div>
      <h2 className="mt-1.5 font-display text-[30px] font-extrabold leading-[1.05] tracking-wide">{ctx.title}</h2>
      {ctx.sub && <p className="mt-1.5 text-sm text-ink-2">{ctx.sub}</p>}
      {ctx.stats.length > 0 && (
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {ctx.stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5 rounded-xl bg-ground p-2.5">
              <span className="font-display text-[26px] font-extrabold leading-none">{s.value}</span>
              <span className="text-[11px] leading-snug text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      {ctx.foot && <p className="mt-3 text-xs text-muted">{ctx.foot}</p>}
    </div>
  );
}
