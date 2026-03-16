import AuthPage from "@/features/auth/AuthPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Afaq",
  description: "Login or register to access Afaq platform.",
};

export default function LoginPage() {
  return <AuthPage />;
}
