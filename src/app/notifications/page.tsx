import { redirect } from "next/navigation";

// Notification settings moved into Settings.
export default function NotificationsPage() {
  redirect("/settings#notifications");
}
