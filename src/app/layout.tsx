import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { NotificationProvider } from "@/components/notify/NotificationProvider";
import { LiveRadioBar } from "@/components/radio/LiveRadioBar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Sicko Central", template: "%s · Sicko Central" },
  description: "Ottawa Senators stats, schedule and a live companion for game nights.",
  robots: { index: false, follow: false },
  // Installed to an iPhone Home Screen: open full screen, dark status bar over the header.
  appleWebApp: { capable: true, title: "Sicko Central", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0e",
  width: "device-width",
  initialScale: 1,
  // Lets the page use the full screen on notched phones; the header and bottom bar pad
  // themselves with the safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <NotificationProvider>
          <div className="flex min-h-dvh flex-col">
            <Header />
            <main className="flex-1 pb-28 lg:pb-12">
              {children}
              <LiveRadioBar />
            </main>
            <BottomNav />
          </div>
        </NotificationProvider>
      </body>
    </html>
  );
}
