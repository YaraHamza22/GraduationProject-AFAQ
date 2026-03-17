import AdminLoginScreen from "@/features/admin/AdminLoginScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Authorization | Afaq Platform",
  description: "Secure administrative gateway for Afaq Platform.",
};

export default function AdminLoginPage() {
  return <AdminLoginScreen />;
}
