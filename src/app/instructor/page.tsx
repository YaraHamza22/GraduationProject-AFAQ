import InstructorDashboard from "@/features/instructor/pages/InstructorDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instructor Dashboard | Afaq",
  description: "Manage your courses and students on Afaq platform.",
};

export default function InstructorHomePage() {
  return <InstructorDashboard />;
}
