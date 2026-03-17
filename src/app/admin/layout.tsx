"use client";

import AdminNavbar from "@/features/admin/components/AdminNavbar";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  
  return (
    <div className="flex bg-slate-50 dark:bg-[#020617] min-h-screen transition-colors duration-300">
      {!isLoginPage && <AdminNavbar />}
      <main className={`flex-1 transition-all duration-300 ${isLoginPage ? "p-0" : (isRTL ? "md:mr-64 mr-20" : "md:ml-64 ml-20")}`}>
        {children}
      </main>
    </div>
  );
}
