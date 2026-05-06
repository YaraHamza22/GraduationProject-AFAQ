"use client";

import React from "react";
import StudentNavbar from "@/features/student/components/StudentNavbar";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStoredStudentRole, getStudentToken } from "@/features/student/studentSession";
import { useRouter } from "next/navigation";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  const router = useRouter();
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    const token = getStudentToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const role = getStoredStudentRole();
    if (role?.includes("instructor") || role?.includes("teacher")) {
      router.replace("/instructor");
      return;
    }

    if (role === "admin" || role?.includes("super-admin") || role?.includes("superadmin")) {
      router.replace("/admin/dashboard");
      return;
    }

    if (role?.includes("manager")) {
      router.replace("/manager/dashboard");
      return;
    }

    setCanRender(true);
  }, [router]);

  if (!canRender) {
    return <div className="min-h-screen bg-(--background)" />;
  }

  return (
    <div className={`min-h-screen bg-(--background) transition-colors duration-300 ${isRTL ? "rtl" : "ltr"}`}>
      <StudentNavbar />
      <main className={`transition-all duration-300 ${isRTL ? "mr-16 lg:mr-64 2xl:mr-72" : "ml-16 lg:ml-64 2xl:ml-72"}`}>
        {children}
      </main>
    </div>
  );
}
