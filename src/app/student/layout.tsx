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
      <main className={`transition-all duration-300 ${isRTL ? "mr-16 lg:mr-64 2xl:mr-72" : "ml-16 lg:ml-64 2xl:ml-72"}`}>
        {children}
      </main>
    </div>
  );
}
