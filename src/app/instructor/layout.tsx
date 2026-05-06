"use client";

import InstructorNavbar from "@/features/instructor/components/InstructorNavbar";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStoredStudentRole, getStudentToken } from "@/features/student/studentSession";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/instructor/login";
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    if (isLoginPage) {
      setCanRender(true);
      return;
    }

    const token = getStudentToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const role = getStoredStudentRole();
    const isInstructor = role?.includes("instructor") || role?.includes("teacher");

    if (isInstructor) {
      setCanRender(true);
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

    router.replace("/student");
  }, [isLoginPage, router]);

  if (!canRender) {
    return <div className="min-h-screen bg-white dark:bg-[#020617]" />;
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#020617] transition-colors duration-300">
        {children}
      </div>
    );
  }
  
  return (
    <div className="flex bg-white dark:bg-[#020617] min-h-screen transition-colors duration-300">
      <InstructorNavbar />
      <main className={`flex-1 transition-all duration-300 ${isRTL ? "md:mr-64 mr-20" : "md:ml-64 ml-20"}`}>
        {children}
      </main>
    </div>
  );
}
