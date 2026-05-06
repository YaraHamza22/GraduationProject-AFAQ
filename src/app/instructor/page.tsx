import InstructorDashboardApi from "@/features/instructor/pages/InstructorDashboardApi";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instructor Dashboard | Afaq",
  description: "Manage your courses and students on Afaq platform.",
};

export default function InstructorHomePage() {
  return <InstructorDashboardApi />;
}
