import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Moving to the real domain: when CANONICAL_HOST is set (www.sickocentral.ca), page visits on
// any other address (sicko-central.vercel.app) are sent there. API routes, the service worker
// and the app's files are left alone, so notification calls already booked against the old
// address, and phones still subscribed through it, keep working. (A domain-wide redirect in
// Vercel's settings would break those.)
// Held off in code until sickocentral.ca resolves (the .ca registry hadn't published it yet).
const READY = false;

export function proxy(req: NextRequest) {
  const canonical = READY ? process.env.CANONICAL_HOST : undefined;
  const host = req.headers.get("host");
  if (!canonical || !host || host === canonical || host.startsWith("localhost")) return NextResponse.next();
  // Preview deployments keep their own address.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.host = canonical;
  url.protocol = "https:";
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Pages only: not /api, Next's files, the service worker, the manifest or icons.
  matcher: ["/((?!api/|_next/|sw\\.js|manifest\\.webmanifest|favicon\\.ico|icon|apple-icon|.*\\.(?:png|svg|jpg|ico|webmanifest|txt|xml)$).*)"],
};
