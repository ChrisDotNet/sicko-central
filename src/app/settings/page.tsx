import type { Metadata } from "next";
import { Page } from "@/components/ui";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { NotificationSettings } from "@/components/notify/NotificationSettings";

export const metadata: Metadata = { title: "Settings" };

// Settings: appearance, then notifications. All kept on this device.
export default function SettingsPage() {
  return (
    <Page width="wide">
      <div className="px-4 pt-5">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">Settings</h1>
        <p className="text-sm text-muted">Kept on this device.</p>
      </div>
      <AppearanceSettings />
      <NotificationSettings />
    </Page>
  );
}
