import Link from "next/link";
import { AlertSoundToggle } from "./notify/AlertSoundToggle";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-line px-4 py-1.5">
      <Link href="/" className="font-display text-2xl font-extrabold leading-none tracking-wide">
        <span className="text-sens-bright">SICKO</span> <span className="text-ink">CENTRAL</span>
      </Link>
      <AlertSoundToggle />
    </header>
  );
}
