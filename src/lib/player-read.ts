// "The read": a few plain sentences built from rules, each shown only when the numbers clearly
// back it up. No generated prose: every claim comes straight from a number on the page.
// Plus the sustainability gauge (running cold / normal / running hot).
import type { GoalieDetail, SkaterDetail } from "./player-stats";
import type { PlayerLanding, SeasonLine } from "./nhl";
import { seasonLabel } from "./format";

export type ReadLine = { tone: "pace" | "hot" | "cold" | "strength" | "role"; html: Array<string | { b: string }> };
export type Gauge = {
  pos: number; // 0 (cold) to 100 (hot)
  label: "Running cold" | "Normal" | "Running hot";
  left: { label: string; now: string; base: string; baseLabel: string };
  right: { label: string; now: string; base: string; baseLabel: string };
  caption: string;
};

const MIN_GAMES = 10;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const dec3 = (v: number) => v.toFixed(3).replace(/^0/, "");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const share = (v: number) => (v >= 0.6 ? "two-thirds" : v >= 0.45 ? "about half" : v >= 0.3 ? "about a third" : null);

function nhlSeasons(p: PlayerLanding): SeasonLine[] {
  return (p.seasonTotals ?? []).filter((s) => s.leagueAbbrev === "NHL" && s.gameTypeId === 2);
}

// Next round number within reach: 50s for goals and wins, 100s for points.
function milestone(total: number, step: number, within: number) {
  const next = Math.ceil((total + 1) / step) * step;
  return next - total <= within ? { next, left: next - total } : null;
}

export function skaterRead(p: PlayerLanding, d: SkaterDetail): { lines: ReadLine[]; gauge: Gauge | null } {
  const lines: ReadLine[] = [];
  const enough = d.gp >= MIN_GAMES;
  const seasons = nhlSeasons(p);
  const current = p.featuredStats?.season;
  const past = seasons.filter((s) => s.season !== current);
  const best = past.reduce<SeasonLine | null>((b, s) => ((s.points ?? 0) > (b?.points ?? -1) ? s : b), null);
  const career = p.careerTotals?.regularSeason ?? {};
  const careerSh = Number(career.shootingPctg) || null;
  const careerShots = past.reduce((t, s) => t + (s.shots ?? 0), 0);

  if (enough && d.points > 0) {
    const pace = Math.round((d.points / d.gp) * 82);
    if (best && (best.points ?? 0) >= 20 && pace > (best.points ?? 0)) {
      lines.push({ tone: "pace", html: ["On pace for ", { b: `${pace} points` }, `, which would beat his career best of ${best.points} (${seasonLabel(best.season)}).`] });
    } else if (pace >= 40) {
      lines.push({ tone: "pace", html: ["On pace for ", { b: `${pace} points` }, best ? ` (career best ${best.points}).` : "."] });
    }
  }
  // Shooting luck: only with a real career sample and enough shots this season.
  if (enough && careerSh && careerShots >= 150 && d.shots >= 25 && d.shPct != null) {
    const diff = d.shPct - careerSh;
    const expected = Math.round(d.shots * careerSh);
    if (diff >= 0.04) {
      lines.push({ tone: "hot", html: ["Shooting ", { b: pct1(d.shPct) }, `, well above his ${pct1(careerSh)} career rate. At his usual rate he'd have about ${expected} goals, not ${d.goals}.`] });
    } else if (diff <= -0.04) {
      lines.push({ tone: "cold", html: ["Shooting ", { b: pct1(d.shPct) }, `, well below his ${pct1(careerSh)} career rate. At his usual rate he'd have about ${expected} goals, not ${d.goals}: more should come.`] });
    }
  }
  if (enough && d.onIceGoalsPct != null && d.onIceShotPct != null) {
    const gap = d.onIceGoalsPct - d.onIceShotPct;
    const g = Math.round(d.onIceGoalsPct * 100);
    const s = Math.round(d.onIceShotPct * 100);
    if (gap >= 0.12) lines.push({ tone: "hot", html: ["The Sens have ", { b: `${g}%` }, ` of the 5-on-5 goals when he's on, but ${s}% of the shot attempts. The scoring is ahead of the play.`] });
    else if (gap <= -0.12) lines.push({ tone: "cold", html: ["The Sens have ", { b: `${s}%` }, ` of the 5-on-5 shot attempts when he's on, but only ${g}% of the goals. The results should catch up.`] });
    else if (d.onIceShotPct >= 0.54) lines.push({ tone: "strength", html: ["The Sens control the play when he's on: ", { b: `${s}%` }, " of 5-on-5 shot attempts."] });
  }
  const h = d.edge?.high;
  if (enough && h && h.shots >= 8 && h.pct >= h.league * 1.8 && h.goals >= 4) {
    lines.push({ tone: "strength", html: [{ b: `${h.goals} goals on ${h.shots} shots` }, ` from in close, where the league scores on ${Math.round(h.league * 100)}%.`] });
  }
  const sh = share(d.ppShare ?? 0);
  if (sh) lines.push({ tone: "role", html: [`Plays ${sh} of the team's power-play time${(d.shToi ?? 0) >= 90 ? ", and kills penalties" : ""}.`] });
  else if ((d.shToi ?? 0) >= 120) lines.push({ tone: "role", html: ["A regular on the penalty kill."] });
  const goals = Number(career.goals) || 0;
  const points = Number(career.points) || 0;
  const mg = milestone(goals, 50, 10);
  const mp = milestone(points, 100, 15);
  if (mg || mp) {
    lines.push({
      tone: "pace",
      html: [mg ? `${mg.left} goal${mg.left === 1 ? "" : "s"} from ` : "", mg ? { b: String(mg.next) } : "", mg && mp ? " and " : "", mp ? `${mp.left} point${mp.left === 1 ? "" : "s"} from ` : "", mp ? { b: String(mp.next) } : "", " in the NHL."],
    });
  }

  let gauge: Gauge | null = null;
  if (enough && careerSh && careerShots >= 150 && d.shPct != null && d.pdo != null) {
    const x = ((d.shPct - careerSh) / 0.05 + (d.pdo - 1) / 0.04) / 2;
    const pos = Math.round(50 + clamp(x, -1.6, 1.6) * 28);
    const label = pos >= 65 ? "Running hot" : pos <= 35 ? "Running cold" : "Normal";
    gauge = {
      pos,
      label,
      left: { label: "Shooting %", now: pct1(d.shPct), base: pct1(careerSh), baseLabel: "Career" },
      right: { label: "On-ice luck (PDO)", now: d.pdo.toFixed(3), base: "1.000", baseLabel: "League" },
      caption:
        label === "Running hot"
          ? "Running hot. The production is real, but some of it is luck; expect his shooting to drift back toward his career rate."
          : label === "Running cold"
            ? "Running cold. His numbers are being held down by bad luck; better results are likely if he keeps getting chances."
            : "About normal for him: the numbers look like what you'd expect, not a hot or cold streak.",
    };
  }
  return { lines: lines.slice(0, 5), gauge };
}

export function goalieRead(p: PlayerLanding, d: GoalieDetail): { lines: ReadLine[]; gauge: Gauge | null } {
  const lines: ReadLine[] = [];
  const enough = d.starts >= 5;
  if (enough && d.gsaa != null && Math.abs(d.gsaa) >= 3 && d.leagueSv) {
    const avg = Math.round(d.shotsAgainst * (1 - d.leagueSv));
    const ga = d.shotsAgainst - d.saves;
    const g = Math.round(Math.abs(d.gsaa));
    lines.push(
      d.gsaa > 0
        ? { tone: "strength", html: ["About ", { b: `${g} goals saved above average` }, `: an average goalie facing his ${d.shotsAgainst} shots would have let in ${avg}, not ${ga}.`] }
        : { tone: "cold", html: ["About ", { b: `${g} goals below average` }, `: an average goalie facing his ${d.shotsAgainst} shots would have let in ${avg}, not ${ga}.`] },
    );
  }
  if (enough && d.qualityStarts != null) {
    const starts = d.log.filter((g) => g.gamesStarted === 1 && (g.shotsAgainst ?? 0) > 0).length;
    if (starts) {
      lines.push({
        tone: d.qualityStarts / starts >= 0.6 ? "strength" : "cold",
        html: d.qualityStarts === starts ? ["A quality start in ", { b: `all ${starts}` }, " of his starts."] : ["Quality starts in ", { b: `${d.qualityStarts} of ${starts}` }, " starts."],
      });
    }
  }
  const high = d.byType.find((t) => t.label.startsWith("In close"));
  if (enough && high && Math.abs(high.sv - high.league) >= 0.03) {
    lines.push({ tone: high.sv > high.league ? "strength" : "cold", html: ["Stops ", { b: pct1(high.sv) }, ` of high-danger shots; the league stops ${pct1(high.league)}.`] });
  }
  if (enough && d.goalSupport && (d.goalSupport.percentile <= 0.3 || d.goalSupport.percentile >= 0.7)) {
    const low = d.goalSupport.percentile <= 0.3;
    lines.push({ tone: "role", html: [`The Sens score ${d.goalSupport.value.toFixed(2)} a game for him, ${low ? "less" : "more"} than for most goalies.${low && d.wins > d.losses ? " He's winning low-scoring games." : ""}`] });
  }
  const wins = Number(p.careerTotals?.regularSeason?.wins) || 0;
  const mw = milestone(wins, 50, 5);
  if (mw) lines.push({ tone: "pace", html: [mw.left === 1 ? "One win from " : `${mw.left} wins from `, { b: String(mw.next) }, " for his career."] });

  let gauge: Gauge | null = null;
  const careerSv = Number(p.careerTotals?.regularSeason?.savePctg) || null;
  if (enough && d.svPct != null && careerSv && d.leagueSv) {
    const x = ((d.svPct - careerSv) / 0.015 + (d.svPct - d.leagueSv) / 0.02) / 2;
    const pos = Math.round(50 + clamp(x, -1.6, 1.6) * 28);
    const label = pos >= 65 ? "Running hot" : pos <= 35 ? "Running cold" : "Normal";
    const bestPast = nhlSeasons(p)
      .filter((s) => s.season !== p.featuredStats?.season && (s.gamesPlayed ?? 0) >= 25)
      .reduce<SeasonLine | null>((b, s) => ((s.savePctg ?? 0) > (b?.savePctg ?? 0) ? s : b), null);
    gauge = {
      pos,
      label,
      left: { label: "Save %", now: dec3(d.svPct), base: dec3(careerSv), baseLabel: "Career" },
      right: { label: "Save %", now: dec3(d.svPct), base: dec3(d.leagueSv), baseLabel: "League" },
      caption:
        label === "Running hot"
          ? `Running hot.${bestPast && (bestPast.savePctg ?? 0) >= d.svPct - 0.002 ? ` He's done it before (${dec3(bestPast.savePctg ?? 0)} in ${seasonLabel(bestPast.season)}),` : ""} but a save percentage this far above his career rate is hard to keep up over a full season.`
          : label === "Running cold"
            ? "Running cold: well below his career rate. Goalies tend to bounce back toward their normal level."
            : "About normal for him.",
    };
  }
  return { lines: lines.slice(0, 5), gauge };
}
