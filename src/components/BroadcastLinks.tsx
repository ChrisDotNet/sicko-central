import { watchLink } from "@/lib/broadcast";

// Network chips; each one links to where that network streams live (sign-in required).
export function BroadcastLinks({
  networks,
  className = "",
  size = "md",
}: {
  networks: string[];
  className?: string;
  size?: "md" | "sm";
}) {
  const box = size === "sm" ? "min-h-6 px-1.5 text-[11px]" : "min-h-8 px-2.5 text-xs";
  if (networks.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {networks.map((n) => {
        const link = watchLink(n);
        return link ? (
          <a
            key={n}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Watch on ${n} (opens ${link.service})`}
            className={`inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface-2 font-bold text-ink ${box}`}
          >
            {n}
            <svg width={size === "sm" ? 10 : 12} height={size === "sm" ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </a>
        ) : (
          <span key={n} className={`inline-flex items-center rounded-md border border-line font-bold text-muted ${box}`}>
            {n}
          </span>
        );
      })}
    </div>
  );
}
