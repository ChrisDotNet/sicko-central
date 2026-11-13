// Game-day facts ("Did you know"): the shapes, and the wording, which can take tonight's
// numbers into account. Safe to use in the browser.
import type { Skater } from "./game";

export type MilestoneStat = "goals" | "assists" | "points" | "wins" | "shutouts";

export type Fact =
  | { kind: "birthday"; playerId: number; name: string; age: number; score: number }
  | { kind: "milestone"; playerId: number; name: string; stat: MilestoneStat; before: number; target: number; score: number }
  | { kind: "games"; playerId: number; name: string; target: number; score: number }
  | { kind: "streak"; playerId: number; name: string; games: number; capped: boolean; score: number }
  | { kind: "team"; key: string; text: string; score: number };

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const STAT_ONE: Record<MilestoneStat, string> = { goals: "goal", assists: "assist", points: "point", wins: "win", shutouts: "shutout" };

// Tonight's contribution to a career stat, from the live box score (skaters only; goalie
// wins and shutouts only count once the game is over, so they aren't adjusted).
function tonight(stat: MilestoneStat, s?: Skater): number {
  if (!s) return 0;
  if (stat === "goals") return s.g;
  if (stat === "assists") return s.a;
  if (stat === "points") return s.g + s.a;
  return 0;
}

// Wording plus a score for ranking, adjusted for what's happened so far tonight.
export function describe(f: Fact, skaters: Skater[]): { text: string; score: number } {
  const s = "playerId" in f ? skaters.find((x) => x.id === f.playerId) : undefined;
  const pts = s ? s.g + s.a : 0;
  const onBoard = s && pts > 0 ? ` He has ${[s.g ? plural(s.g, "goal") : "", s.a ? plural(s.a, "assist") : ""].filter(Boolean).join(" and ")} tonight.` : "";
  switch (f.kind) {
    case "birthday":
      return { text: `It's ${f.name}'s ${ordinal(f.age)} birthday.${onBoard}`, score: f.score + (pts ? 15 : 0) };
    case "milestone": {
      const now = f.before + tonight(f.stat, s);
      if (now >= f.target) return { text: `${f.name} reached ${f.target} career NHL ${f.stat} tonight.`, score: 100 };
      const need = f.target - now;
      return { text: `${f.name} is ${plural(need, STAT_ONE[f.stat])} away from ${f.target} career NHL ${f.stat}.`, score: f.score + (now > f.before ? 10 : 0) };
    }
    case "games":
      return { text: `${f.name} is playing his ${ordinal(f.target)} NHL game.`, score: f.score };
    case "streak": {
      const n = f.capped ? `at least ${f.games}` : `${f.games}`;
      return pts
        ? { text: `${f.name} came in with a point in ${n} straight games, and he's on the board again tonight.`, score: f.score + 10 }
        : { text: `${f.name} has a point in ${n} straight games.`, score: f.score };
    }
    case "team":
      return { text: f.text, score: f.score };
  }
}

// The three facts to show: best first, one per player.
export function pickFacts(facts: Fact[], skaters: Skater[], count = 3): Array<{ key: string; text: string }> {
  const out: Array<{ key: string; text: string; score: number; who?: number }> = [];
  const ranked = facts
    .map((f) => ({ f, ...describe(f, skaters) }))
    .sort((a, b) => b.score - a.score);
  for (const r of ranked) {
    const who = "playerId" in r.f ? r.f.playerId : undefined;
    if (who != null && out.some((o) => o.who === who)) continue;
    out.push({ key: `${r.f.kind}-${who ?? ("key" in r.f ? r.f.key : "")}`, text: r.text, score: r.score, who });
    if (out.length >= count) break;
  }
  return out.map(({ key, text }) => ({ key, text }));
}
