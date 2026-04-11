"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import {
  Award,
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Moon,
  Sun,
  UserCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion } from "framer-motion";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { clearStudentSession, getStudentToken } from "@/features/student/studentSession";

const SyrianFlag = () => (
  <svg width="20" height="14" viewBox="0 0 3 2" className="rounded-sm shadow-sm">
    <rect width="3" height="2" fill="#3D8E33" />
    <rect y=".667" width="3" height=".667" fill="#FFF" />
    <rect y="1.333" width="3" height=".667" fill="#000" />
    <path d="M0.75 0.85 L0.81 1.03 L1.0 1.03 L0.85 1.14 L0.91 1.32 L0.75 1.21 L0.59 1.32 L0.65 1.14 L0.5 1.03 L0.69 1.03 Z" fill="#CE1126" />
    <path d="M1.5 0.85 L1.56 1.03 L1.75 1.03 L1.6 1.14 L1.66 1.32 L1.5 1.21 L1.34 1.32 L1.4 1.14 L1.25 1.03 L1.44 1.03 Z" fill="#CE1126" />
    <path d="M2.25 0.85 L2.31 1.03 L2.5 1.03 L2.35 1.14 L2.41 1.32 L2.25 1.21 L2.09 1.32 L2.15 1.14 L2.0 1.03 L2.19 1.03 Z" fill="#CE1126" />
  </svg>
);

const USAFlag = () => (
  <svg width="20" height="14" viewBox="0 0 7410 3900" className="rounded-sm shadow-sm">
    <rect width="7410" height="3900" fill="#B22234"/>
    <path d="M0,300H7410M0,900H7410M0,1500H7410M0,2100H7410M0,2700H7410M0,3300H7410" stroke="#FFF" strokeWidth="300"/>
    <rect width="2964" height="2100" fill="#3C3B6E"/>
    <g fill="#FFF">
      <g id="s18">
        <g id="s9">
          <g id="s5">
            <g id="s">
              <path id="star" d="M247,90l70.5,217.1-184.6-134.1h228.2L176.5,307.1z"/>
            </g>
            <use href="#s" y="420"/>
            <use href="#s" y="840"/>
            <use href="#s" y="1260"/>
            <use href="#s" y="1680"/>
          </g>
          <use href="#s5" x="247" y="210"/>
        </g>
        <use href="#s9" x="494"/>
      </g>
      <use href="#s18" x="988"/>
      <use href="#s9" x="1976"/>
      <use href="#s5" x="2470"/>
    </g>
  </svg>
);

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, href: "/student", label: "std.dashboard" },
  { id: "courses", icon: BookOpen, href: "/student/courses", label: "std.courses" },
  { id: "quizzes", icon: FileText, href: "/student/quizzes", label: "std.quizzes" },
  { id: "certificates", icon: Award, href: "/student/certificates", label: "std.certificates" },
  { id: "profile", icon: UserCircle, href: "/student/profile", label: "nav.profile" },
];

export default function StudentNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [mounted, setMounted] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = getStudentToken();
      const logoutUrl = getStudentApiRequestUrl("/auth/logout");

      if (logoutUrl) {
        await axios.post(logoutUrl, {}, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearStudentSession();
      setIsLoggingOut(false);
      router.push("/login");
    }
  };

  return (
    <nav className={`fixed top-0 h-screen w-16 lg:w-64 2xl:w-72 bg-white dark:bg-(--background) flex flex-col z-50 transition-colors duration-300 ${
      isRTL ? "right-0 border-l border-slate-300 dark:border-white/5" : "left-0 border-r border-slate-300 dark:border-white/5"
    }`}>
      <div className="p-3 sm:p-4 lg:p-6 mb-6 lg:mb-8">
        <Link href="/student" className={`flex items-center gap-3 group ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
          <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform duration-300">
            <GraduationCap className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <span className="hidden lg:block text-2xl font-black text-(--foreground) tracking-tighter">
            A<span className="text-indigo-500">faq</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 px-2 sm:px-3 lg:px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.id} href={item.href}>
              <div className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 lg:px-4 lg:py-4 transition-all duration-300 group ${
                isRTL ? "flex-row-reverse justify-center lg:justify-start" : "flex-row justify-center lg:justify-start"
              } ${
                isActive
                  ? "bg-indigo-600/10 text-indigo-600 dark:text-white"
                  : "opacity-40 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}>
                {isActive && (
                  <motion.div
                    layoutId="activeNavStd"
                    className={`absolute ${isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"} w-1 h-8 bg-indigo-500`}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 lg:w-6 lg:h-6 shrink-0 transition-colors duration-300 ${isActive ? "text-indigo-400" : "group-hover:text-indigo-300"}`} />
                <span className="hidden lg:block font-semibold tracking-tight">
                  {t(item.label)}
                </span>

                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="ml-auto hidden lg:block"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                  </motion.div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-2 sm:p-3 lg:p-4 space-y-2 border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-around gap-2 p-2 rounded-2xl bg-slate-100 dark:bg-white/5">
          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none flex items-center gap-2"
            title={language === "en" ? "Arabic" : "English"}
          >
            {language === "en" ? <SyrianFlag /> : <USAFlag />}
          </button>

          <div className="w-px h-4 bg-slate-300 dark:bg-white/10" />

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none"
            title="Toggle Theme"
          >
            {mounted && (theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />)}
          </button>
        </div>

        <button onClick={handleLogout} disabled={isLoggingOut} className="w-full">
          <div className={`flex items-center gap-3 rounded-2xl px-3 py-3 lg:px-4 lg:py-4 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/5 transition-all duration-300 cursor-pointer group ${
            isRTL ? "flex-row-reverse justify-center lg:justify-start" : "flex-row justify-center lg:justify-start"
          }`}>
            {isLoggingOut ? (
              <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" />
            ) : (
              <LogOut className={`w-5 h-5 lg:w-6 lg:h-6 transition-transform ${isRTL ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
            )}
            <span className="hidden lg:block font-bold">{isLoggingOut ? "Logging out..." : t("nav.logout")}</span>
          </div>
        </button>
      </div>
    </nav>
  );
}
