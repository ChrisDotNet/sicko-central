"use client";

import { useEffect } from "react";

// The browser tab's title for state the page's metadata can't know: which tab or view is
// open, a live score. Renders nothing; sets document.title while mounted.
export function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} · Sicko Central`;
  }, [title]);
  return null;
}
