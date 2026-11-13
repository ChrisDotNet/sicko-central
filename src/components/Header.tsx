import Link from "next/link";
import { HeaderNav } from "./HeaderNav";
import { Logo } from "./Logo";
import { AlertSoundToggle } from "./notify/AlertSoundToggle";

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-8 px-4 py-1.5 md:max-w-4xl md:px-6 lg:max-w-[1360px] lg:justify-start lg:px-10">
        <Link href="/" aria-label="Sicko Central home">
          <Logo />
        </Link>
        <HeaderNav />
        <div className="lg:ml-auto">
          <AlertSoundToggle />
        </div>
      </div>
    </header>
  );
}
