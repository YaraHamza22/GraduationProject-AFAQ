"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ShieldCheck, 
  UserCircle,
  LogOut,
  Shield,
  Sun,
  Moon,
  ChevronRight,
  Tags,
  BookOpen
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { clearAdminSession, getStoredAdminUser, subscribeToAdminSession } from "@/features/admin/adminSession";
import { useTheme } from "next-themes";

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
  { name: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard, label: "adm.dashboard" },
  { name: "profile", href: "/admin/profile", icon: UserCircle, label: "nav.profile" },
];

const managementItems = [
  { name: "Students", href: "/admin/students", icon: GraduationCap },
  { name: "Courses", href: "/admin/courses", icon: BookOpen, label: "adm.courses" },
  {
    name: "Instructors",
    href: "/admin/instructors",
    icon: Users,
    children: [
      { name: "All Instructors", href: "/admin/instructors", label: "adm.all_instructors" },
      { name: "Course Category", href: "/admin/course-categories", icon: Tags, label: "adm.course_category" },
    ],
  },
  { name: "Managers", href: "/admin/managers", icon: ShieldCheck },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [adminLabel, setAdminLabel] = React.useState("Super Admin");
  const [adminMeta, setAdminMeta] = React.useState("Authenticated control");

  React.useEffect(() => {
    const syncAdminIdentity = () => {
      const adminUser = getStoredAdminUser();
      const identity =
        typeof adminUser?.name === "string" && adminUser.name.trim()
          ? adminUser.name
          : typeof adminUser?.email === "string" && adminUser.email.trim()
            ? adminUser.email
            : "Super Admin";

      const role =
        typeof adminUser?.role === "string" && adminUser.role.trim()
          ? adminUser.role.replace(/_/g, " ")
          : "Authenticated control";

      setAdminLabel(identity);
      setAdminMeta(role);
      setMounted(true);
    };

    syncAdminIdentity();
    return subscribeToAdminSession(syncAdminIdentity);
  }, []);

  const handleLogout = () => {
    clearAdminSession();
    router.replace("/admin/login");
  };

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
      isRTL ? "right-0 border-l border-slate-200 dark:border-white/5" : "left-0 border-r border-slate-200 dark:border-white/5"
    }`}>
      {/* Logo Section */}
      <div className="p-6 mb-8">
        <Link href="/admin/dashboard" className={`flex items-center gap-3 group ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
          <div className="p-3 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 group-hover:scale-110 transition-transform duration-300">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="hidden md:block text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
            Afaq <span className="text-indigo-500 italic">Admin</span>
          </span>
        </Link>
      </div>

      {/* Nav Items */}
      <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar uppercase tracking-widest text-[10px] font-black">
        <div>
          <p className={`px-4 mb-4 text-slate-400 dark:text-white/20 ${isRTL ? 'text-right' : ''}`}>{t("adm.overview")}</p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${isRTL ? "flex-row-reverse" : "flex-row"} ${
                    isActive 
                    ? "bg-indigo-600/10 text-indigo-600 dark:text-white" 
                    : "text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}>
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavAdmin"
                        className={`absolute ${isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} w-1.5 h-8 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-indigo-500" : "group-hover:text-indigo-400"}`} />
                    <span className="hidden md:block">
                      {t(item.label)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className={`px-4 mb-4 text-slate-400 dark:text-white/20 ${isRTL ? 'text-right' : ''}`}>{t("adm.management")}</p>
          <div className="space-y-1">
            {managementItems.map((item) => {
              const isDirectActive = pathname === item.href;
              const activeChild = item.children?.find((child) => pathname === child.href);
              const isActive = isDirectActive || Boolean(activeChild);
              const Icon = item.icon;
              const translationKey = `adm.${item.name.toLowerCase()}`;
              return (
                <div key={item.name}>
                  <Link href={item.href}>
                    <div className={`relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${isRTL ? "flex-row-reverse" : "flex-row"} ${
                      isActive
                      ? "bg-indigo-600/10 text-indigo-600 dark:text-white"
                      : "text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}>
                      {isDirectActive && (
                        <motion.div
                          layoutId="activeNavAdmin"
                          className={`absolute ${isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} w-1.5 h-8 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-indigo-500" : "group-hover:text-indigo-400"}`} />
                      <span className="hidden md:block">
                        {t(translationKey)}
                      </span>
                      <ChevronRight className={`ml-auto w-3 h-3 opacity-20 group-hover:opacity-100 transition-all ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'} ${item.children && isActive ? 'rotate-90 opacity-100' : ''} hidden md:block`} />
                    </div>
                  </Link>

                  {item.children && isActive ? (
                    <div className={`mt-1 hidden space-y-1 md:block ${isRTL ? "mr-4 border-r pr-3" : "ml-4 border-l pl-3"} border-indigo-500/10`}>
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href;

                        return (
                          <Link key={child.href} href={child.href}>
                            <div className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-[9px] transition-all ${
                              isRTL ? "flex-row-reverse" : "flex-row"
                            } ${
                              isChildActive
                                ? "bg-indigo-600/10 text-indigo-600 dark:text-white"
                                : "text-slate-500 dark:text-white/35 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-500"
                            }`}>
                              {isChildActive ? (
                                <motion.div
                                  layoutId="activeNavAdmin"
                                  className={`absolute ${isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} h-6 w-1 bg-indigo-500`}
                                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                              ) : null}
                              {ChildIcon ? <ChildIcon className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />}
                              <span>{t(child.label)}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toggles and Actions */}
      <div className="p-4 space-y-2 border-t border-slate-200 dark:border-white/5">
        <div className="rounded-3xl border border-slate-200 bg-slate-100/70 p-4 shadow-sm dark:border-white/5 dark:bg-white/5 dark:shadow-none">
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/30 ${isRTL ? "text-right" : ""}`}>
            Secure Session
          </p>
          <p className={`mt-2 truncate text-sm font-black text-slate-900 dark:text-white ${isRTL ? "text-right" : ""}`}>
            {adminLabel}
          </p>
          <p className={`mt-1 truncate text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/35 ${isRTL ? "text-right" : ""}`}>
            {adminMeta}
          </p>
        </div>

        <div className="flex items-center justify-around gap-2 p-2 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none flex items-center gap-2"
          >
            {language === "en" ? <SyrianFlag /> : <USAFlag />}
          </button>
          
          <div className="w-px h-4 bg-slate-300 dark:bg-white/10" />

          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full"
        >
          <div className="flex items-center gap-3 p-4 rounded-2xl text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/5 transition-all duration-300 cursor-pointer group uppercase font-black text-[10px] tracking-widest">
            <LogOut className={`w-5 h-5 transition-transform ${isRTL ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
            <span className="hidden md:block">Logout</span>
          </div>
        </button>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
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
