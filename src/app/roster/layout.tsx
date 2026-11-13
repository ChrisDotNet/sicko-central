import type { ReactNode } from "react";
import { Page } from "@/components/ui";

export default function Layout({ children }: { children: ReactNode }) {
  return <Page width="narrow">{children}</Page>;
}
