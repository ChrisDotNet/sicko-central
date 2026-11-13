"use client";

import { useState } from "react";
import type { StandingRow } from "@/lib/nhl";
import { StandingsTable } from "./StandingsTable";

const VIEWS = ["Division", "Wild card", "League"] as const;
type View = (typeof VIEWS)[number];

function Group({ title, aside, rows }: { title: string; aside?: string; rows: StandingRow[] }) {
  return (
    <section className="px-4 pt-6">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider">{title}</h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      <StandingsTable rows={rows} />
    </section>
  );
}

export function StandingsTabs({ rows, ottConference, ottDivision }: { rows: StandingRow[]; ottConference: string; ottDivision: string }) {
  const [view, setView] = useState<View>("Division");

  // Ottawa's conference and division first.
  const conferences = [...new Set(rows.map((r) => r.conferenceAbbrev))].sort((a, b) =>
    a === ottConference ? -1 : b === ottConference ? 1 : a.localeCompare(b),
  );
  const confName = (c: string) => (c === "E" ? "Eastern Conference" : c === "W" ? "Western Conference" : c);
  const divisionsOf = (c: string) =>
    [...new Set(rows.filter((r) => r.conferenceAbbrev === c).map((r) => r.divisionName))].sort((a, b) =>
      a === ottDivision ? -1 : b === ottDivision ? 1 : a.localeCompare(b),
    );
  const byDivision = (d: string) => rows.filter((r) => r.divisionName === d).sort((a, b) => a.divisionSequence - b.divisionSequence);

  return (
    <>
      <div role="group" aria-label="Standings view" className="flex gap-1.5 px-4 pt-4 md:max-w-md">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`min-h-11 flex-1 rounded-xl border text-sm font-semibold ${
              view === v ? "border-ink bg-ink text-ground" : "border-line-strong text-ink-2"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Desktop: the four divisions in a 2×2 grid, each conference on its own row. */}
      {view === "Division" && (
        <div className="lg:grid lg:grid-cols-2">
          {conferences.flatMap((c) => divisionsOf(c).map((d) => <Group key={d} title={d} aside={confName(c)} rows={byDivision(d)} />))}
        </div>
      )}

      {/* Desktop: the two conferences side by side. */}
      {view === "Wild card" && (
        <div className="lg:grid lg:grid-cols-2">
        {conferences.map((c) => {
          const inConf = rows.filter((r) => r.conferenceAbbrev === c);
          const wildcard = inConf.filter((r) => r.wildcardSequence > 0).sort((a, b) => a.wildcardSequence - b.wildcardSequence);
          return (
            <div key={c}>
              <div className="px-4 pt-7 text-xs font-bold uppercase tracking-widest text-gold-text">{confName(c)}</div>
              {divisionsOf(c).map((d) => (
                <Group key={d} title={`${d} top 3`} rows={byDivision(d).slice(0, 3)} />
              ))}
              <Group title="Wild card" aside="Top two make the playoffs" rows={wildcard} />
            </div>
          );
        })}
        </div>
      )}

      {view === "League" && (
        <Group title="NHL" aside="All 32 teams" rows={[...rows].sort((a, b) => a.leagueSequence - b.leagueSequence)} />
      )}
    </>
  );
}
