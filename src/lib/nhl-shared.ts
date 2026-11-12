// Constants and helpers safe to import from client components (no server-only APIs).
export const LIVE_STATES = ["LIVE", "CRIT"];
export const FINAL_STATES = ["OFF", "FINAL"];

export function name(t?: { default: string }): string {
  return t?.default ?? "";
}
