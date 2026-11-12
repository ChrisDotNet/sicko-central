// Team colours for the small colour bars next to tricodes. No logos by design.
const COLORS: Record<string, string> = {
  ANA: "#F47A38", BOS: "#FFB81C", BUF: "#2E5BB8", CAR: "#CE1126", CBJ: "#2B4C8C",
  CGY: "#D2001C", CHI: "#CF0A2C", COL: "#6F263D", DAL: "#006847", DET: "#CE1126",
  EDM: "#FF4C00", FLA: "#C8102E", LAK: "#A2AAAD", MIN: "#154734", MTL: "#1F4E99",
  NJD: "#CE1126", NSH: "#FFB81C", NYI: "#00539B", NYR: "#1D4FA0", OTT: "#C52032",
  PHI: "#F74902", PIT: "#FCB514", SEA: "#68A2B9", SJS: "#006D75", STL: "#1E4FA0",
  TBL: "#2A5BA8", TOR: "#2E5BB8", UTA: "#71AFE5", VAN: "#00843D", VGK: "#B4975A",
  WPG: "#4B6FA5", WSH: "#C8102E",
};

export function teamColor(abbrev: string | undefined): string {
  return (abbrev && COLORS[abbrev]) || "#6B7280";
}

export const OTT = "OTT";
export const OTT_ID = 9;

export const ATLANTIC = ["BOS", "BUF", "DET", "FLA", "MTL", "OTT", "TBL", "TOR"];
