"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AuditorNavbar from "@/features/auditor/components/AuditorNavbar";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStoredStudentRole, getStudentToken } from "@/features/student/studentSession";

export default function AuditorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isRTL } = useLanguage();
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    const token = getStudentToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const role = getStoredStudentRole();
    if (!role?.includes("auditor")) {
      router.replace("/login");
      return;
    }

    setCanRender(true);
  }, [router]);

  if (!canRender) {
    return <div className="min-h-screen bg-white dark:bg-[#020617]" />;
  }

  return (
    <div className={`min-h-screen bg-[#f7f8fb] text-slate-950 transition-colors dark:bg-[#020617] dark:text-white ${isRTL ? "rtl" : "ltr"}`}>
      <AuditorNavbar />
      <main className={`min-h-screen transition-all duration-300 ${isRTL ? "mr-20 lg:mr-72" : "ml-20 lg:ml-72"}`}>{children}</main>
    </div>
  );
}
