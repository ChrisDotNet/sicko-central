import Link from "next/link";
import { HeaderNav, LiveStrip } from "./HeaderNav";
import { Logo } from "./Logo";
import { SettingsLink } from "./SettingsLink";
import { PushSync } from "./notify/PushSync";

export function Header() {
  return (
    <header className="border-b border-line pt-[env(safe-area-inset-top)]">
      {/* Home Screen app on iPhone: the status bar's text is always white, so the strip behind
          it stays dark in light mode too. Zero height in a browser tab. */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-[#0d0d0e]" />
      <div className="mx-auto flex max-w-xl items-center justify-between gap-8 px-4 py-1.5 md:max-w-4xl md:px-6 lg:max-w-[1360px] lg:justify-start lg:px-10">
        <Link href="/" aria-label="Sicko Central home">
          <Logo />
        </Link>
        <HeaderNav />
        <div className="lg:ml-auto">
          <SettingsLink />
          <PushSync />
        </div>
      </div>
      <LiveStrip />
    </header>
  );
}
