"use client";

import AdminNavbar from "@/features/admin/components/AdminNavbar";
import { hasAdminSession } from "@/features/admin/adminSession";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Shield } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

function subscribeToClientRender() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const isClient = useSyncExternalStore(subscribeToClientRender, getClientSnapshot, getServerSnapshot);
  const isAuthenticated = isClient ? hasAdminSession() : false;

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (isLoginPage && isAuthenticated) {
      router.replace("/admin/dashboard");
      return;
    }

    if (!isLoginPage && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, isClient, isLoginPage, pathname, router]);

  if (!isClient || (isLoginPage && isAuthenticated) || (!isLoginPage && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 transition-colors duration-300 dark:bg-[#020617]">
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 px-6 py-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Shield className="h-5 w-5 animate-pulse" />
          </div>
          <div className={isRTL ? "text-right" : ""}>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/40">
              Admin Gateway
            </p>
            <p className="text-sm font-medium text-slate-700 dark:text-white/80">
              Verifying secure access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 dark:bg-[#020617] min-h-screen transition-colors duration-300">
      {!isLoginPage && <AdminNavbar />}
      <main className={`flex-1 transition-all duration-300 ${isLoginPage ? "p-0" : (isRTL ? "md:mr-64 mr-20" : "md:ml-64 ml-20")}`}>
        {children}
      </main>
    </div>
  );
}
