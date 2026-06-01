"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  Moon,
  Shield,
  Sun,
  Tags,
  UserCircle,
  Users,
  Video,
  X,
  GraduationCap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  clearAdminSession,
  getAdminToken,
  getStoredAdminUser,
  subscribeToAdminSession,
} from "@/features/admin/adminSession";
import { getAdminApiRequestUrl } from "@/features/admin/adminApi";
import NotificationBell from "@/components/notifications/NotificationBell";

const SyrianFlag = () => (
  <svg width="20" height="14" viewBox="0 0 60 40" className="rounded-sm shadow-sm" aria-hidden="true">
    <rect width="60" height="40" fill="#007a3d" />
    <rect y="13.33" width="60" height="13.34" fill="#ffffff" />
    <rect y="26.66" width="60" height="13.34" fill="#000000" />
    <path d="M20 16.5l1.18 3.64H25l-3.09 2.24 1.18 3.62L20 23.78 16.91 26l1.18-3.62L15 20.14h3.82Z" fill="#ce1126" />
    <path d="M30 16.5l1.18 3.64H35l-3.09 2.24 1.18 3.62L30 23.78 26.91 26l1.18-3.62L25 20.14h3.82Z" fill="#ce1126" />
    <path d="M40 16.5l1.18 3.64H45l-3.09 2.24 1.18 3.62L40 23.78 36.91 26l1.18-3.62L35 20.14h3.82Z" fill="#ce1126" />
  </svg>
);

const USAFlag = () => (
  <svg width="20" height="14" viewBox="0 0 7410 3900" className="rounded-sm shadow-sm">
    <rect width="7410" height="3900" fill="#B22234" />
    <path d="M0,300H7410M0,900H7410M0,1500H7410M0,2100H7410M0,2700H7410M0,3300H7410" stroke="#FFF" strokeWidth="300" />
    <rect width="2964" height="2100" fill="#3C3B6E" />
    <g fill="#FFF">
      <g id="s18">
        <g id="s9">
          <g id="s5">
            <g id="s">
              <path id="star" d="M247,90l70.5,217.1-184.6-134.1h228.2L176.5,307.1z" />
            </g>
            <use href="#s" y="420" />
            <use href="#s" y="840" />
            <use href="#s" y="1260" />
            <use href="#s" y="1680" />
          </g>
          <use href="#s5" x="247" y="210" />
        </g>
        <use href="#s9" x="494" />
      </g>
      <use href="#s18" x="988" />
      <use href="#s9" x="1976" />
      <use href="#s5" x="2470" />
    </g>
  </svg>
);

const navItems = [
  { name: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard, label: "adm.dashboard" },
  { name: "profile", href: "/admin/profile", icon: UserCircle, label: "nav.profile" },
];

type AdminNavChild = {
  name: string;
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type AdminNavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: AdminNavChild[];
};

const managementItems: AdminNavItem[] = [
  { name: "Students", href: "/admin/students", icon: GraduationCap, label: "adm.students" },
  {
    name: "Employees",
    href: "/admin/managers",
    icon: Users,
    label: "adm.employees",
    children: [
      { name: "Auditors", href: "/admin/managers", label: "mng.auditors" },
      { name: "Instructors", href: "/admin/instructors", label: "adm.all_instructors" },
    ],
  },
  { name: "Courses", href: "/admin/courses", icon: BookOpen, label: "adm.courses" },
  { name: "Course Category", href: "/admin/course-categories", icon: Tags, label: "adm.course_category" },
  { name: "Virtual Meet", href: "/admin/virtual-meet", icon: Video, label: "Virtual Meet" },
  {
    name: "Chatting",
    href: "/admin/forum",
    icon: MessagesSquare,
    label: "Chatting",
    children: [{ name: "Forum", href: "/admin/forum", icon: MessageSquare, label: "Forum" }],
  },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
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
    setMobileOpen(false);
    router.replace("/admin/login");
  };

  const closeMobileMenu = () => setMobileOpen(false);
  const navPositionClass = isRTL
    ? "right-0 border-l border-slate-200 dark:border-white/5"
    : "left-0 border-r border-slate-200 dark:border-white/5";

  const renderNavLinks = (mobile = false) => (
    <div className="space-y-8 px-4 text-[10px] font-black uppercase tracking-widest">
      <div>
        <p className={`mb-4 px-4 text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>{t("adm.overview")}</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} onClick={closeMobileMenu}>
                <div
                  className={`group relative flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 ${
                    isRTL ? "flex-row-reverse" : "flex-row"
                  } ${
                    isActive
                      ? "bg-indigo-600/10 text-indigo-600 dark:text-white"
                      : "text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  {isActive ? (
                    <motion.div
                      layoutId={`admin-overview-${mobile ? "mobile" : "desktop"}`}
                      className={`absolute ${isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"} h-8 w-1.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  ) : null}
                  <Icon className={`h-5 w-5 transition-colors duration-300 ${isActive ? "text-indigo-500" : "group-hover:text-indigo-400"}`} />
                  <span className={mobile ? "block" : "hidden lg:block"}>{t(item.label)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <p className={`mb-4 px-4 text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>{t("adm.management")}</p>
        <div className="space-y-1">
          {managementItems.map((item) => {
            const isDirectActive = pathname === item.href;
            const activeChild = item.children?.find((child) => pathname === child.href);
            const isActive = isDirectActive || Boolean(activeChild);
            const Icon = item.icon;

            return (
              <div key={item.name}>
                <Link href={item.href} onClick={closeMobileMenu}>
                  <div
                    className={`group relative flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 ${
                      isRTL ? "flex-row-reverse" : "flex-row"
                    } ${
                      isActive
                        ? "bg-indigo-600/10 text-indigo-600 dark:text-white"
                        : "text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {isDirectActive ? (
                      <motion.div
                        layoutId={`admin-management-${mobile ? "mobile" : "desktop"}`}
                        className={`absolute ${isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"} h-8 w-1.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    ) : null}
                    <Icon className={`h-5 w-5 transition-colors duration-300 ${isActive ? "text-indigo-500" : "group-hover:text-indigo-400"}`} />
                    <span className={mobile ? "block" : "hidden lg:block"}>{t(item.label)}</span>
                    <ChevronRight
                      className={`ml-auto h-3 w-3 opacity-20 transition-all group-hover:opacity-100 ${
                        isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
                      } ${item.children && isActive ? "rotate-90 opacity-100" : ""} ${mobile ? "block" : "hidden lg:block"}`}
                    />
                  </div>
                </Link>

                {item.children && isActive ? (
                  <div className={`mt-1 space-y-1 border-indigo-500/10 ${isRTL ? "mr-4 border-r pr-3" : "ml-4 border-l pl-3"} ${mobile ? "block" : "hidden lg:block"}`}>
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = pathname === child.href;
                      return (
                        <Link key={child.href} href={child.href} onClick={closeMobileMenu}>
                          <div
                            className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-[9px] transition-all ${
                              isRTL ? "flex-row-reverse" : "flex-row"
                            } ${
                              isChildActive
                                ? "bg-indigo-600/10 text-indigo-600 dark:text-white"
                                : "text-slate-500 dark:text-white/35 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-500"
                            }`}
                          >
                            {isChildActive ? (
                              <motion.div
                                layoutId={`admin-child-${mobile ? "mobile" : "desktop"}`}
                                className={`absolute ${isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"} h-6 w-1 bg-indigo-500`}
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
  );

  const renderFooter = (mobile = false) => (
    <div className="space-y-2 border-t border-slate-200 p-4 dark:border-white/5">
      <div className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100/70 px-3 py-2 dark:border-white/10 dark:bg-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
        <span className={`${mobile ? "block" : "hidden lg:block"} text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/40`}>
          Notifications
        </span>
        <NotificationBell getRequestUrl={getAdminApiRequestUrl} token={getAdminToken()} isRTL={isRTL} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-100/70 p-4 shadow-sm dark:border-white/5 dark:bg-white/5 dark:shadow-none">
        <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/30 ${isRTL ? "text-right" : ""}`}>
          {t("adm.secure_session")}
        </p>
        <p className={`mt-2 truncate text-sm font-black text-slate-900 dark:text-white ${isRTL ? "text-right" : ""}`}>{adminLabel}</p>
        <p className={`mt-1 truncate text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/35 ${isRTL ? "text-right" : ""}`}>{adminMeta}</p>
      </div>

      <div className={`flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 backdrop-blur-md dark:border-white/5 dark:bg-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
        <button
          onClick={() => setLanguage(language === "en" ? "ar" : "en")}
          className="flex items-center gap-2 rounded-xl p-2 shadow-sm transition-colors hover:bg-white dark:shadow-none dark:hover:bg-white/10"
        >
          {language === "en" ? <SyrianFlag /> : <USAFlag />}
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-xl p-2 shadow-sm transition-colors hover:bg-white dark:shadow-none dark:hover:bg-white/10"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>
      </div>

      <button type="button" onClick={handleLogout} className="w-full">
        <div className={`group flex items-center gap-3 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-rose-500/60 transition-all duration-300 hover:bg-rose-500/5 hover:text-rose-500 ${isRTL ? "flex-row-reverse" : ""}`}>
          <LogOut className={`h-5 w-5 transition-transform ${isRTL ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
          <span className={mobile ? "block" : "hidden lg:block"}>{t("adm.logout")}</span>
        </div>
      </button>
    </div>
  );

  if (!mounted) {
    return (
      <>
        <div className="fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#020617]/95 lg:hidden">
          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="rounded-2xl bg-indigo-600 p-3 shadow-xl shadow-indigo-600/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{t("adm.afaq")}</span>
          </div>
        </div>
        <nav className={`fixed top-0 hidden h-screen w-64 flex-col bg-white transition-colors duration-300 dark:bg-[#020617] lg:flex ${navPositionClass}`}>
          <div className="flex-1" />
        </nav>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#020617]/95 lg:hidden">
        <div className={`flex h-20 items-center justify-between px-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:border-indigo-400/40 dark:hover:text-indigo-300"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/admin/dashboard" className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="rounded-2xl bg-indigo-600 p-3 shadow-xl shadow-indigo-600/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {t("adm.afaq")} <span className="text-indigo-500">{t("adm.admin")}</span>
            </span>
          </Link>

          <div className="shrink-0">
            <NotificationBell getRequestUrl={getAdminApiRequestUrl} token={getAdminToken()} isRTL={isRTL} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] lg:hidden">
            <button type="button" aria-label="Close navigation" onClick={closeMobileMenu} className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
            <motion.nav
              initial={{ x: isRTL ? 320 : -320 }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? 320 : -320 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className={`absolute top-0 h-full w-[min(88vw,320px)] overflow-y-auto bg-white pb-6 pt-5 shadow-2xl dark:bg-[#020617] ${navPositionClass}`}
            >
              <div className={`mb-6 flex items-center justify-between px-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Link href="/admin/dashboard" onClick={closeMobileMenu} className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className="rounded-2xl bg-indigo-600 p-3 shadow-xl shadow-indigo-600/20">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    {t("adm.afaq")} <span className="text-indigo-500">{t("adm.admin")}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {renderNavLinks(true)}
              {renderFooter(true)}
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav className={`fixed top-0 z-50 hidden h-screen w-64 flex-col bg-white transition-colors duration-300 dark:bg-[#020617] lg:flex ${navPositionClass}`}>
        <div className="mb-8 p-6">
          <Link href="/admin/dashboard" className={`group flex items-center gap-3 ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
            <div className="rounded-2xl bg-indigo-600 p-3 shadow-xl shadow-indigo-600/20 transition-transform duration-300 group-hover:scale-110">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
              {t("adm.afaq")} <span className="italic text-indigo-500">{t("adm.admin")}</span>
            </span>
          </Link>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto">{renderNavLinks(false)}</div>
        {renderFooter(false)}
      </nav>

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
    </>
  );
}
