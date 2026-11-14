import { watchLink } from "@/lib/broadcast";
import type { TicketLinks } from "@/lib/tickets";
import { LinkMenu, TicketIcon, TvIcon } from "./LinkMenu";

// The standard pair of menus for an upcoming game: Streaming (each network, opening the
// game's own page where we found one) and Tickets (Gametime, then Ticketmaster).
// Used on the home page's next-game card and the schedule.

export function StreamingMenu({
  networks,
  streams,
  size = "md",
  align = "left",
  iconOnlyBelowLg = false,
}: {
  networks: string[];
  streams?: Record<string, string>;
  size?: "md" | "sm";
  align?: "left" | "right";
  iconOnlyBelowLg?: boolean;
}) {
  return (
    <LinkMenu
      label="Streaming"
      icon={<TvIcon />}
      size={size}
      align={align}
      iconOnlyBelowLg={iconOnlyBelowLg}
      items={networks.map((n) => {
        const w = watchLink(n);
        return { label: n, note: w?.service ?? "No link", href: streams?.[n] ?? w?.href ?? null };
      })}
    />
  );
}

export function TicketsMenu({
  tickets,
  size = "md",
  align = "right",
  iconOnlyBelowLg = false,
}: {
  tickets: TicketLinks;
  size?: "md" | "sm";
  align?: "left" | "right";
  iconOnlyBelowLg?: boolean;
}) {
  return (
    <LinkMenu
      label="Tickets"
      icon={<TicketIcon />}
      align={align}
      tone="gold"
      size={size}
      iconOnlyBelowLg={iconOnlyBelowLg}
      items={[
        { label: "Gametime", note: "Resale", href: tickets.gametime },
        ...(tickets.ticketmaster ? [{ label: "Ticketmaster", note: "Official", href: tickets.ticketmaster }] : []),
      ]}
    />
  );
}
