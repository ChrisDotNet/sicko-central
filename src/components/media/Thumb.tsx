"use client";

import { useState } from "react";

// A thumbnail from the outlet's own servers (NHL.com, TSN, Sportsnet), loaded directly by
// the browser. Deliberately not passed through Next's image optimizer: that would copy the
// outlet's photo onto our hosting, and Vercel Hobby limits optimized images anyway.
// Decorative: the title next to it says what it is. Falls back to a plain block.
export function Thumb({
  src,
  className = "",
  play = false,
  square = false,
}: {
  src?: string | null;
  className?: string;
  play?: boolean;
  square?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-surface-2 ${square ? "" : "rounded-lg"} ${className}`}>
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- see note above
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {play && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z" /></svg>
          </span>
        </span>
      )}
    </span>
  );
}
