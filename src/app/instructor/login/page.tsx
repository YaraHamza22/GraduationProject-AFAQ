import InstructorLoginScreen from "@/features/instructor/InstructorLoginScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instructor Login | Afaq",
  description: "Instructor login access for Afaq platform.",
};

export default function InstructorLoginPage() {
  return <InstructorLoginScreen />;
}

