import Link from "next/link";
import { Logo } from "./Logo";
import { AlertSoundToggle } from "./notify/AlertSoundToggle";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-line px-4 py-1.5">
      <Link href="/" aria-label="Sicko Central home">
        <Logo />
      </Link>
      <AlertSoundToggle />
    </header>
  );
}
