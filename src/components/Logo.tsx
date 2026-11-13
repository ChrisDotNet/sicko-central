// Sicko Central mark: a goal light (the red lamp behind the net), with the wordmark.
// Original artwork; the same drawing is used for the favicon and home-screen icon (src/app).
export function GoalLight({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g stroke="#E2B64E" strokeWidth="3.5" strokeLinecap="round">
        <path d="M32 4v7" />
        <path d="M12 12l5 5" />
        <path d="M52 12l-5 5" />
        <path d="M5 31h7" />
        <path d="M52 31h7" />
      </g>
      <path d="M16 46V35a16 16 0 0 1 32 0v11z" fill="#E23A4C" />
      <path d="M23 34a9 9 0 0 1 9-9" fill="none" stroke="#FFD0D5" strokeWidth="3" strokeLinecap="round" />
      <rect x="11" y="46" width="42" height="9" rx="3" fill="#F4F4F5" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <GoalLight />
      <span className="font-display text-2xl font-extrabold leading-none tracking-wide">
        <span className="text-sens-bright">SICKO</span> <span className="text-ink">CENTRAL</span>
      </span>
    </span>
  );
}
