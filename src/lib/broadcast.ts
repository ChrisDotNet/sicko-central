// Where each Canadian broadcaster streams its channels online. Most need a TV-provider
// sign-in or the network's own streaming subscription (TSN+, Sportsnet+, etc.).
// The NHL's network codes include regional variants (TSN5, RDS2, SNE, SNO...), so match by prefix.
// These are the fallbacks: src/lib/streams.ts finds the game's own page on TSN+ and Sportsnet+.
const RULES: Array<{ test: RegExp; href: string; service: string }> = [
  { test: /^TSN/i, href: "https://www.tsn.ca/live/", service: "TSN+" },
  { test: /^(SN|SPORTSNET)/i, href: "https://watch.sportsnet.ca/", service: "Sportsnet+" },
  { test: /^RDS/i, href: "https://www.rds.ca/en-direct/", service: "RDS" },
  { test: /^(CBC|HNIC)/i, href: "https://gem.cbc.ca/", service: "CBC Gem" },
  { test: /^CITY/i, href: "https://www.citytv.com/", service: "Citytv+" },
  // TVA Sports streams each channel live (no page per game): TVAS2 on its own page.
  { test: /^TVAS?2$/i, href: "https://www.tvasports.ca/en-direct-2", service: "TVA Sports 2" },
  { test: /^TVA/i, href: "https://www.tvasports.ca/en-direct-1", service: "TVA Sports" },
  { test: /^(PRIME|AMAZON)/i, href: "https://www.primevideo.com/", service: "Prime Video" },
];

export function watchLink(network: string): { href: string; service: string } | null {
  const rule = RULES.find((r) => r.test.test(network.trim()));
  return rule ? { href: rule.href, service: rule.service } : null;
}
