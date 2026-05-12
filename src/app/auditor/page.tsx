import AuditorWorkspace from "@/features/auditor/pages/AuditorWorkspace";

export const metadata = {
  title: "Auditor Command | Afaq",
  description: "Content review workspace for Afaq auditors.",
};

export default function AuditorPage() {
  return <AuditorWorkspace mode="dashboard" />;
}
