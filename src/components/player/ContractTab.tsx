import { PSection } from "./Bits";

// Contract, for now: PuckPedia's own embeddable player summary (cap hit, contract year, expiry
// status). PuckPedia invites sites to embed it; it updates itself. Figures are the official
// US$ ones. Our own contract layout (the deal, year by year, the read, ≈ C$) needs their data
// API and waits for that.

// PuckPedia's address for a player: "Tim Stützle" -> "tim-stuetzle".
export function puckpediaSlug(first: string, last: string) {
  return `${first} ${last}`
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ContractTab({ first, last, full }: { first: string; last: string; full: string }) {
  const slug = puckpediaSlug(first, last);
  return (
    <PSection title="Contract" aside="Official figures, US$">
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <iframe
          src={`https://puckpedia.com/e/player/${slug}/`}
          title={`${full} contract summary from PuckPedia`}
          loading="lazy"
          className="block h-[200px] w-full border-0"
        />
      </div>
      <p className="mt-2.5 text-xs leading-snug text-muted">
        Cap hit, contract year and status when it ends, from PuckPedia.{" "}
        <a href={`https://puckpedia.com/player/${slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">
          Full contract on PuckPedia ↗
        </a>
      </p>
    </PSection>
  );
}
