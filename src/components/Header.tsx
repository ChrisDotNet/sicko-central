import Link from "next/link";
import { HeaderNav, LiveStrip } from "./HeaderNav";
import { Logo } from "./Logo";
import { BellLink } from "./notify/BellLink";
import { PushSync } from "./notify/PushSync";

export function Header() {
  return (
    <header className="border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-8 px-4 py-1.5 md:max-w-4xl md:px-6 lg:max-w-[1360px] lg:justify-start lg:px-10">
        <Link href="/" aria-label="Sicko Central home">
          <Logo />
        </Link>
        <HeaderNav />
        <div className="lg:ml-auto">
          <BellLink />
          <PushSync />
        </div>
      </div>
      <LiveStrip />
    </header>
  );
}
