"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  TrendingUp, 
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  BarChart3
} from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";

export default function AdminDashboard() {
  const { t, isRTL } = useLanguage();
  const stats = [
    { label: "Total Students", value: "4,284", icon: GraduationCap, color: "text-blue-500", trend: "+12%", up: true },
    { label: "Active Instructors", value: "142", icon: Users, color: "text-purple-500", trend: "+5%", up: true },
    { label: "Pending Approvals", value: "28", icon: ShieldAlert, color: "text-amber-500", trend: "-2", up: false },
    { label: "Global Success Rate", value: "94.2%", icon: TrendingUp, color: "text-emerald-500", trend: "+1.2%", up: true },
  ];

  return (
    <div className="p-8 md:p-12 relative min-h-screen bg-slate-50 dark:bg-transparent transition-colors duration-500">
      {/* Premium Background Effects */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 dark:bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <header className="mb-12 relative z-10">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className={`space-y-2 ${isRTL ? 'text-right' : ''}`}
        >
          <div className={`flex items-center gap-2 text-indigo-500 font-black uppercase tracking-[0.3em] text-[10px] ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Activity className="w-3 h-3" />
            {t("adm.sys_control")}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
            {t("adm.dashboard").split(" ").map((word, i) => (
              <span key={i} className={i === 1 ? "bg-clip-text text-transparent bg-linear-to-r from-indigo-500 to-purple-500" : ""}>
                {word}{" "}
              </span>
            ))}
          </h1>
          <p className="text-slate-400 dark:text-white/20 font-medium text-lg">{t("adm.central_hub")}</p>
        </motion.div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
        {stats.map((stat, idx) => {
          const translationKey = `adm.${stat.label.toLowerCase().replace(/ /g, "_")}`;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="group p-8 rounded-[40px] bg-white dark:bg-white/3 border border-slate-200 dark:border-white/5 backdrop-blur-xl relative overflow-hidden transition-all hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 shadow-sm dark:shadow-none"
            >
               <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-4 rounded-3xl bg-slate-100/50 dark:bg-white/5 transition-colors group-hover:bg-indigo-500/20`}>
                      <stat.icon className={`w-6 h-6 ${stat.color} group-hover:text-indigo-400`} />
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full ${stat.up ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {stat.trend}
                  </div>
               </div>
               <p className={`text-slate-400 dark:text-white/20 text-xs font-black uppercase tracking-widest mb-1 ${isRTL ? 'text-right' : ''}`}>{t(translationKey)}</p>
               <h3 className={`text-4xl font-black text-slate-900 dark:text-white tracking-tighter ${isRTL ? 'text-right' : ''}`}>{stat.value}</h3>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
         {/* Chart Placeholder / Activity */}
         <div className="lg:col-span-2 p-10 rounded-[48px] bg-white dark:bg-white/3 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none min-h-[400px] flex flex-col justify-between">
            <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t("adm.growth")}</h4>
                        <p className="text-[10px] uppercase font-black text-slate-400 dark:text-white/20 tracking-widest">{t("adm.realtime")}</p>
                    </div>
                </div>
                <select className="bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none text-slate-600 dark:text-white/60">
                    <option>Last 7 Days</option>
                    <option>This Month</option>
                    <option>Overall</option>
                </select>
            </div>

            {/* Simulated Chart Logic with Motion */}
            <div className={`flex-1 flex items-end gap-3 h-[200px] ${isRTL ? 'flex-row-reverse' : ''}`}>
                {[40, 70, 45, 90, 65, 80, 55, 75, 50, 85].map((val, i) => (
                    <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${val}%` }}
                        transition={{ delay: 0.5 + (i * 0.05), duration: 1, ease: "circOut" }}
                        className="flex-1 bg-linear-to-t from-indigo-500/40 to-indigo-500 rounded-t-xl hover:from-purple-500/40 hover:to-purple-500 transition-colors cursor-pointer group relative"
                    >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded-lg pointer-events-none">
                            {val}%
                        </div>
                    </motion.div>
                ))}
            </div>
         </div>

         {/* Side Widgets */}
         <div className="space-y-8">
            <div className="p-10 rounded-[48px] bg-slate-100 dark:bg-linear-to-br dark:from-indigo-600 dark:to-violet-800 border border-slate-200 dark:border-none relative overflow-hidden group shadow-sm dark:shadow-2xl">
                <motion.div
                    animate={{ rotate: 15 }}
                    className={`absolute -bottom-8 ${isRTL ? '-left-8' : '-right-8'}`}
                >
                    <Zap className="w-64 h-64 text-indigo-500/10 dark:text-white/5" />
                </motion.div>
                <div className={`relative z-10 space-y-6 ${isRTL ? 'text-right' : ''}`}>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t("adm.sys_status")}</h4>
                    <p className="text-slate-500 dark:text-indigo-100/60 font-medium">{t("adm.status_desc")}</p>
                    <button className="w-full py-4 bg-indigo-600 dark:bg-white text-white dark:text-indigo-900 font-black rounded-2xl shadow-xl transition-all hover:scale-[1.03] active:scale-95 uppercase tracking-widest text-[10px]">
                        {t("adm.security_prot")}
                    </button>
                </div>
            </div>

            <div className="p-8 rounded-[40px] bg-white dark:bg-white/3 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                <h4 className={`text-lg font-black mb-8 text-slate-900 dark:text-white uppercase tracking-widest text-[10px] ${isRTL ? 'text-right' : ''}`}>{t("adm.recent_events")}</h4>
                <div className="space-y-6">
                    {[
                        { event: "New Instructor Application", time: "2 min ago", type: "warn" },
                        { event: "Subscription Surge", time: "15 min ago", type: "success" },
                        { event: "Database Backup Completed", time: "1 hour ago", type: "info" }
                    ].map((item, i) => (
                        <div key={i} className={`flex gap-4 items-center group cursor-pointer ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                            <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform" />
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 transition-colors tracking-tight">{item.event}</p>
                                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">{item.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}
