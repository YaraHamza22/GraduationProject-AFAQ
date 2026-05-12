import AuditorWorkspace from "@/features/auditor/pages/AuditorWorkspace";

export const metadata = {
  title: "Auditor Inbox | Afaq",
};

export default function AuditorNotificationsPage() {
  return <AuditorWorkspace mode="notifications" />;
}
