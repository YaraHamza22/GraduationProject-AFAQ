"use client";

import InstructorNavbar from "@/features/instructor/components/InstructorNavbar";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  
  return (
    <div className="flex bg-white dark:bg-[#020617] min-h-screen transition-colors duration-300">
      <InstructorNavbar />
      <main className={`flex-1 transition-all duration-300 ${isRTL ? "md:mr-64 mr-20" : "md:ml-64 ml-20"}`}>
        {children}
      </main>
    </div>
  );
}
