import Link from "next/link";
import type { ReactNode } from "react";

// A player's name, linked to their page. Without an id it's plain text.
export function PlayerLink({ id, children, className = "" }: { id?: number | null; children: ReactNode; className?: string }) {
  if (!id) return <>{children}</>;
  return (
    <Link href={`/player/${id}`} className={`relative z-10 underline-offset-2 hover:underline ${className}`}>
      {children}
    </Link>
  );
}

// "Batherson, Chabot": each name linked.
export function PlayerList({ names, ids, mark }: { names: string[]; ids: number[]; mark?: (id: number) => boolean }) {
  return (
    <>
      {names.map((n, i) => (
        <span key={`${n}-${i}`}>
          {i > 0 && ", "}
          {mark?.(ids[i]) && "★ "}
          <PlayerLink id={ids[i]}>{n}</PlayerLink>
        </span>
      ))}
    </>
  );
}
