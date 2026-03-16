"use client";

import React from "react";
import StudentNavbar from "@/features/student/components/StudentNavbar";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();

  return (
    <div className={`min-h-screen bg-(--background) transition-colors duration-300 ${isRTL ? "rtl" : "ltr"}`}>
      <StudentNavbar />
      <main className={`transition-all duration-300 ${isRTL ? "md:mr-64 mr-20" : "md:ml-64 ml-20"}`}>
        {children}
      </main>
    </div>
  );
}
