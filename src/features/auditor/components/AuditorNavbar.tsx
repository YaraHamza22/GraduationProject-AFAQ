"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpenCheck,
  ClipboardCheck,
  Gauge,
  Languages,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCircle,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { auditorPost, clearAuditorSession, getAuditorToken } from "@/features/auditor/auditorApi";

const navItems = [
  { href: "/auditor", label: "Command", icon: Gauge },
  { href: "/auditor/courses", label: "Courses", icon: BookOpenCheck },
  { href: "/auditor/quizzes", label: "Quizzes", icon: ClipboardCheck },
  { href: "/auditor/notifications", label: "Inbox", icon: Bell },
  { href: "/auditor/profile", label: "Profile", icon: UserCircle },
];

export default function AuditorNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, isRTL } = useLanguage();
  const [mounted, setMounted] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (getAuditorToken()) {
        await auditorPost("/auth/logout");
      }
    } catch (error) {
      console.error("Auditor logout failed:", error);
    } finally {
      clearAuditorSession();
      setIsLoggingOut(false);
      setMobileOpen(false);
      router.replace("/login");
    }
  };

  const asidePosition = isRTL ? "right-0 border-l" : "left-0 border-r";

  const renderLinks = (mobile = false) => (
    <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/auditor" && pathname.startsWith(item.href));

        return (
          <Link key={item.href} href={item.href} className="block" onClick={() => setMobileOpen(false)}>
            <div
              className={`relative flex items-center gap-3 rounded-2xl px-4 py-4 text-sm font-bold transition ${
                isRTL ? "flex-row-reverse" : ""
              } ${
                isActive
                  ? "text-slate-950 dark:text-white"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId={`auditorActiveNav-${mobile ? "mobile" : "desktop"}`}
                  className={`absolute inset-y-2 w-1 rounded-full bg-linear-to-b from-indigo-500 via-fuchsia-500 to-emerald-400 ${isRTL ? "right-0" : "left-0"}`}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 dark:bg-white/5"}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className={mobile ? "block" : "hidden lg:block"}>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = (mobile = false) => (
    <div className="space-y-3 border-t border-slate-200 p-3 dark:border-white/10">
      <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5 ${mobile ? "block" : "hidden lg:block"}`}>
        <p className="text-xs font-black text-slate-950 dark:text-white">Auditor mode</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/50">Check content, request edits, and keep review trails tidy.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setLanguage(language === "en" ? "ar" : "en")}
          className="flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
          aria-label="Switch language"
        >
          <Languages className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
          aria-label="Switch theme"
        >
          {mounted && theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-rose-50 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
      >
        <LogOut className="h-4.5 w-4.5" />
        <span className={mobile ? "inline" : "hidden lg:inline"}>{isLoggingOut ? "Leaving..." : "Logout"}</span>
      </button>
    </div>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-2xl dark:border-white/10 dark:bg-[#020617]/95 lg:hidden">
        <div className={`flex h-20 items-center justify-between px-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition dark:border-white/10 dark:bg-white/5 dark:text-white/80"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/auditor" className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/20 dark:bg-white dark:text-slate-950">
              <ShieldCheck className="h-6 w-6" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </span>
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Afaq Audit</p>
            </div>
          </Link>
          <div className="w-12" />
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] lg:hidden">
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
            <motion.aside
              initial={{ x: isRTL ? 320 : -320 }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? 320 : -320 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className={`absolute top-0 flex h-full w-[min(88vw,320px)] flex-col border-slate-200 bg-white/95 backdrop-blur-2xl dark:border-white/10 dark:bg-[#020617]/95 ${asidePosition}`}
            >
              <div className="flex items-center justify-between px-4 py-5">
                <Link href="/auditor" className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`} onClick={() => setMobileOpen(false)}>
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/20 dark:bg-white dark:text-slate-950">
                    <ShieldCheck className="h-6 w-6" />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                      <Sparkles className="h-2.5 w-2.5 text-white" />
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Afaq Audit</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Review OS</p>
                  </div>
                </Link>
                <button type="button" onClick={() => setMobileOpen(false)} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {renderLinks(true)}
              {renderFooter(true)}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <aside className={`fixed top-0 z-50 hidden h-screen w-72 flex-col border-slate-200 bg-white/90 backdrop-blur-2xl transition-colors dark:border-white/10 dark:bg-[#020617]/90 lg:flex ${asidePosition}`}>
        <div className="px-6 py-5">
          <Link href="/auditor" className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/20 dark:bg-white dark:text-slate-950">
              <ShieldCheck className="h-6 w-6" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </span>
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Afaq Audit</p>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Review OS</p>
            </div>
          </Link>
        </div>
        {renderLinks(false)}
        {renderFooter(false)}
      </aside>
    </>
  );
}
