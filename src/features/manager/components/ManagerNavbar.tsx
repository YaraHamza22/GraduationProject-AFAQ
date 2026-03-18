"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ShieldCheck, 
  BookOpen, 
  FileText, 
  Layers, 
  HelpCircle, 
  LogOut,
  Settings,
  Sun,
  Moon,
  ChevronRight,
  ClipboardList,
  CheckSquare,
  Network,
  Database
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useTheme } from "next-themes";

const SyrianFlag = () => (
  <svg width="20" height="14" viewBox="0 0 3 2" className="rounded-sm shadow-sm transition-transform hover:scale-110">
    <rect width="3" height="2" fill="#3D8E33" />
    <rect y=".667" width="3" height=".667" fill="#FFF" />
    <rect y="1.333" width="3" height=".667" fill="#000" />
    <path d="M0.75 0.85 L0.81 1.03 L1.0 1.03 L0.85 1.14 L0.91 1.32 L0.75 1.21 L0.59 1.32 L0.65 1.14 L0.5 1.03 L0.69 1.03 Z" fill="#CE1126" />
    <path d="M1.5 0.85 L1.56 1.03 L1.75 1.03 L1.6 1.14 L1.66 1.32 L1.5 1.21 L1.34 1.32 L1.4 1.14 L1.25 1.03 L1.44 1.03 Z" fill="#CE1126" />
    <path d="M2.25 0.85 L2.31 1.03 L2.5 1.03 L2.35 1.14 L2.41 1.32 L2.25 1.21 L2.09 1.32 L2.15 1.14 L2.0 1.03 L2.19 1.03 Z" fill="#CE1126" />
  </svg>
);

const USAFlag = () => (
  <svg width="20" height="14" viewBox="0 0 7410 3900" className="rounded-sm shadow-sm transition-transform hover:scale-110">
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

const navSections = [
  {
    title: "mng.platform",
    items: [
      { name: "mng.students", href: "/manager/students", icon: GraduationCap },
      { name: "mng.instructors", href: "/manager/instructors", icon: Users },
      { name: "mng.auditors", href: "/manager/auditors", icon: ShieldCheck },
    ]
  },
  {
    title: "mng.academic",
    items: [
      { name: "mng.programs", href: "/manager/programs", icon: Layers },
      { name: "mng.courses", href: "/manager/courses", icon: BookOpen },
      { name: "mng.units", href: "/manager/units", icon: Network },
      { name: "mng.lessons", href: "/manager/lessons", icon: FileText },
    ]
  },
  {
    title: "mng.assessment",
    items: [
      { name: "mng.quizzes", href: "/manager/quizzes", icon: HelpCircle },
      { name: "mng.questions", href: "/manager/questions", icon: ClipboardList },
      { name: "mng.options", href: "/manager/options", icon: CheckSquare },
    ]
  },
  {
    title: "mng.system",
    items: [
      { name: "mng.attempts", href: "/manager/attempts", icon: Database },
      { name: "mng.answers", href: "/manager/answers", icon: ClipboardList },
    ]
  }
];

export default function ManagerNavbar() {
  const pathname = usePathname();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <nav className={`fixed top-0 h-screen w-20 md:w-64 bg-white dark:bg-[#020617] flex flex-col z-50 transition-colors duration-300 ${
        isRTL ? "right-0 border-l border-slate-200 dark:border-white/5" : "left-0 border-r border-slate-200 dark:border-white/5"
      }`}>
        <div className="flex-1" />
      </nav>
    );
  }

  return (
    <nav className={`fixed top-0 h-screen w-20 md:w-64 bg-white dark:bg-[#020617] flex flex-col z-50 transition-colors duration-300 ${
      isRTL ? "right-0 border-l border-slate-200 dark:border-black/20" : "left-0 border-r border-slate-200 dark:border-black/20"
    }`}>
      {/* Platform Logo */}
      <div className="p-6">
        <Link href="/manager/dashboard" className={`flex items-center gap-3 group ${isRTL ? "flex-row-reverse text-right" : "flex-row text-left"}`}>
          <div className="p-3 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300 ring-2 ring-white/10">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div className="hidden md:block">
            <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter block leading-none">
              Afaq <span className="text-indigo-500 italic">Mng</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-indigo-400/50 uppercase tracking-widest mt-1">Management Hub</span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar pt-4">
        {/* Dashboard Link */}
        <Link href="/manager/dashboard">
          <div className={`relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${isRTL ? "flex-row-reverse" : "flex-row"} ${
            pathname === "/manager/dashboard"
            ? "bg-indigo-600/10 text-indigo-600 dark:text-white" 
            : "text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5"
          }`}>
            {pathname === "/manager/dashboard" && (
              <motion.div 
                layoutId="activeNavManager"
                className={`absolute ${isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} w-1.5 h-8 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <LayoutDashboard className={`w-5 h-5 transition-colors duration-300 ${pathname === "/manager/dashboard" ? "text-indigo-500" : "group-hover:text-indigo-400"}`} />
            <span className="hidden md:block text-xs font-black uppercase tracking-widest">
              {t("mng.dashboard")}
            </span>
          </div>
        </Link>

        {navSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className={`px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? 'text-right' : ''}`}>
              {t(section.title)}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href}>
                    <div className={`relative flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 group ${isRTL ? "flex-row-reverse" : "flex-row"} ${
                      isActive 
                      ? "bg-indigo-600/10 text-indigo-600 dark:text-white" 
                      : "text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}>
                      {isActive && (
                        <motion.div 
                          layoutId="activeNavManager"
                          className={`absolute ${isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} w-1.5 h-6 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-indigo-500" : "group-hover:text-indigo-400"}`} />
                      <span className="hidden md:block text-[11px] font-bold">
                        {t(item.name)}
                      </span>
                      <ChevronRight className={`ml-auto w-3 h-3 opacity-20 group-hover:opacity-100 transition-all ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'} ${isActive ? 'hidden' : 'hidden md:block'}`} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="p-4 space-y-2 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-around gap-2 p-2 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
          <button 
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="flex-1 flex justify-center p-2 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-white/10"
            title={language === "en" ? "Translate to Arabic" : "Translate to English"}
          >
            {language === "en" ? <SyrianFlag /> : <USAFlag />}
          </button>
          
          <div className="w-px h-4 bg-slate-300 dark:bg-white/10" />

          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex-1 flex justify-center p-2 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-white/10"
            title="Toggle Light/Dark Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

        <Link href="/login">
          <div className={`flex items-center gap-3 p-4 rounded-2xl text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300 group ${isRTL ? "flex-row-reverse text-right" : "flex-row text-left"}`}>
            <LogOut className={`w-5 h-5 transition-transform ${isRTL ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
            <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">
              {language === "en" ? "Log out" : "تسجيل خروج"}
            </span>
          </div>
        </Link>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </nav>
  );
}
