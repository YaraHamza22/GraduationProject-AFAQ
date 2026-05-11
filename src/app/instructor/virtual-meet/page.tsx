import InstructorVirtualMeetPage from "@/features/instructor/pages/InstructorVirtualMeetPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Virtual Meet | Afaq Instructor",
  description: "Manage your meeting integrations, sessions, and attendance tracking.",
};

export default function InstructorVirtualMeetRoute() {
  return <InstructorVirtualMeetPage />;
}
