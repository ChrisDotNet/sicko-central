"use client";

import { setTheme, useTheme } from "@/lib/theme";
import type { ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; sub: string }[] = [
  { value: "system", label: "System", sub: "Matches this device" },
  { value: "dark", label: "Dark", sub: "Always" },
  { value: "light", label: "Light", sub: "Always" },
];

// Appearance: System (follow the device's light or dark setting), Dark or Light.
export function AppearanceSettings() {
  const theme = useTheme();
  return (
    <section className="px-4 pt-6">
      <h2 className="px-1 pb-2 font-display text-2xl font-bold uppercase tracking-wider">Appearance</h2>
      <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-2 md:max-w-md">
        {OPTIONS.map((o) => {
          const on = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTheme(o.value)}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-2.5 ${
                on ? "border-sens bg-sens-ground" : "border-line bg-surface"
              }`}
            >
              <span className="text-[15px] font-bold">{o.label}</span>
              <span className="text-[11px] text-muted">{o.sub}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
