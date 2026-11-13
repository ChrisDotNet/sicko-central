// Where each Canadian broadcaster streams its channels online. Most need a TV-provider
// sign-in or the network's own streaming subscription (TSN+, Sportsnet+, etc.).
// The NHL's network codes include regional variants (TSN5, RDS2, SNE, SNO...), so match by prefix.
const RULES: Array<{ test: RegExp; href: string; service: string }> = [
  { test: /^TSN/i, href: "https://www.tsn.ca/live", service: "TSN" },
  { test: /^(SN|SPORTSNET)/i, href: "https://www.sportsnet.ca/watch/", service: "Sportsnet+" },
  { test: /^RDS/i, href: "https://www.rds.ca/", service: "RDS" },
  { test: /^(CBC|HNIC)/i, href: "https://gem.cbc.ca/", service: "CBC Gem" },
  { test: /^CITY/i, href: "https://www.citytv.com/", service: "Citytv+" },
  { test: /^TVA/i, href: "https://www.tvasports.ca/", service: "TVA Sports" },
  { test: /^(PRIME|AMAZON)/i, href: "https://www.primevideo.com/", service: "Prime Video" },
];

export function watchLink(network: string): { href: string; service: string } | null {
  const rule = RULES.find((r) => r.test.test(network.trim()));
  return rule ? { href: rule.href, service: rule.service } : null;
}
