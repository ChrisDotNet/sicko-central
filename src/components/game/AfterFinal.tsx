"use client";

import { useEffect, useState } from "react";
import type { LiveGame } from "@/lib/game";
import type { Race } from "@/lib/team-stats";
import { ordinal, pct1, recStr } from "@/lib/team-stats-shared";
import type { Rec, SeasonLens } from "@/lib/team-stats-shared";

type After = { form: { rec: Rec; streak: string; lastId: number | null } | null; race: Race | null };

function streakText(code: string, n: number) {
  if (code === "W") return n > 1 ? `Won ${n} straight` : "Won one";
  if (code === "L") return n > 1 ? `Lost ${n} straight` : "Lost one";
  return n > 1 ? `OT or shootout losses, ${n} straight` : "OT or shootout loss";
}

// After the final: what tonight changed. Record and streak from the schedule, the Atlantic place
// and the Leafs gap from the standings (against the numbers when the page loaded), and the
// power play with tonight added. Retries until the schedule shows tonight as final.
export function AfterFinal({ game, lens, race, className = "" }: { game: LiveGame; lens: SeasonLens; race: Race | null; className?: string }) {
  const [after, setAfter] = useState<After | null>(null);
  const counted = after?.form?.lastId === game.id;

  useEffect(() => {
    if (counted) return;
    let stop = false;
    let tries = 0;
    const load = async () => {
      try {
        const res = await fetch("/api/stats/after");
        if (res.ok && !stop) setAfter((await res.json()) as After);
      } catch {}
    };
    load();
    const id = setInterval(() => {
      if (++tries > 20) clearInterval(id);
      else load();
    }, 60_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [counted]);

  if (!counted || !after?.form) return null;
  const { form } = after;
  const now = after.race;
  const games = form.rec.w + form.rec.l + form.rec.otl;
  const rows: { label: string; value: string }[] = [];
  rows.push({ label: "Record", value: recStr(form.rec) });
  const s = form.streak.match(/^(W|L|OT)(\d+)$/);
  if (s) rows.push({ label: "Streak", value: streakText(s[1], Number(s[2])) });
  if (now) {
    const before = race && race.gp < now.gp ? race.place : null;
    rows.push({
      label: now.division || "Division",
      value: before && before !== now.place ? `${ordinal(before)} → ${ordinal(now.place)}` : `${ordinal(now.place)}${now.wildcard ? `, wild card ${now.wildcard}` : ""}`,
    });
  }
  // Power play with tonight added (the NHL's season report catches up later), or taken out
  // if the report already counts tonight.
  const pp = game.powerPlay;
  if (pp.ottOpps > 0 && lens.ott.ppOpps > 0) {
    let b: number | null = null;
    let a: number | null = null;
    if (lens.ott.gp === games - 1) {
      b = lens.ott.ppGoals / lens.ott.ppOpps;
      a = (lens.ott.ppGoals + pp.ottGoals) / (lens.ott.ppOpps + pp.ottOpps);
    } else if (lens.ott.gp === games && lens.ott.ppOpps > pp.ottOpps) {
      a = lens.ott.ppGoals / lens.ott.ppOpps;
      b = (lens.ott.ppGoals - pp.ottGoals) / (lens.ott.ppOpps - pp.ottOpps);
    }
    if (a !== null && b !== null) rows.push({ label: "Power play", value: `${pct1(b)} → ${pct1(a)} (${pp.ottGoals} for ${pp.ottOpps})` });
  }
  if (now?.leafs) {
    const before = race?.leafs && race.gp < now.gp ? race.leafs.gap : null;
    const gap = now.leafs.gap;
    const word = gap >= 0 ? "ahead of" : "behind";
    rows.push({ label: "Leafs", value: before !== null && before !== gap ? `${Math.abs(before)} → ${Math.abs(gap)} points ${word}` : `${Math.abs(gap)} points ${word}` });
  }

  return (
    <section className={`px-4 pt-3 ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-3.5 py-2.5 text-xs font-bold uppercase tracking-widest text-gold-text">What tonight changed</div>
        <ul>
          {rows.map((r) => (
            <li key={r.label} className="flex items-baseline justify-between gap-3 border-b border-line px-3.5 py-2.5 text-[13px] last:border-b-0">
              <span className="text-ink-2">{r.label}</span>
              <b className="text-right text-ink">{r.value}</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
