import type { Metadata } from "next";
import { Page } from "@/components/ui";
import { NotificationSettings } from "@/components/notify/NotificationSettings";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <Page width="wide">
      <NotificationSettings />
    </Page>
  );
}
