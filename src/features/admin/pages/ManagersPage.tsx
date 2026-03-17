"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Plus, 
  MoreVertical,
  Key,
  Database,
  Globe
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const managers = [
  { id: 1, name: "Principal Administrator", role: "Super Admin", access: "Full System", status: "Active" },
  { id: 2, name: "Yara Al-Sayed", role: "Content Manager", access: "Course/Instructor Approval", status: "Active" },
  { id: 3, name: "Regional Manager", role: "Auditor", access: "Read-only Reports", status: "Active" },
  { id: 4, name: "Maintenance Bot", role: "System Service", access: "Database/Logs", status: "Automated" },
];

export default function ManagersManagement() {
  const { t, isRTL } = useLanguage();
  return (
    <div className={`p-8 md:p-12 relative min-h-screen ${isRTL ? "text-right" : ""}`}>
      <header className="mb-12 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className={isRTL ? "text-right" : "text-left"}>
          <div className={`flex items-center gap-2 text-indigo-500 font-extrabold uppercase tracking-[0.3em] text-[10px] mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <ShieldCheck className="w-3 h-3" />
            {t("adm.security_gov")}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
            {t("adm.overview")} <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-500 to-purple-500">{t("adm.managers")}</span>
          </h1>
        </div>
        
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> {isRTL ? "إضافة مدير" : "Add Manager"}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 font-bold">
        {managers.map((manager, idx) => (
          <motion.div
            key={manager.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group p-8 rounded-[48px] bg-white dark:bg-white/3 border border-slate-200 dark:border-white/5 relative overflow-hidden transition-all hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 shadow-sm dark:shadow-none backdrop-blur-3xl"
          >
            <div className={`flex justify-between items-start mb-8 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 transition-transform group-hover:rotate-12">
                        <Key className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{manager.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{manager.role}</p>
                    </div>
                </div>
                <button className="p-2 opacity-20 hover:opacity-100 transition-opacity text-slate-900 dark:text-white">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{isRTL ? "مستوى الوصول" : "Access Level"}</span>
                    </div>
                    <span className="text-xs font-black text-slate-400 dark:text-white/20 uppercase tracking-wider">{manager.access}</span>
                </div>
                
                <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{isRTL ? "الحالة" : "Status"}</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                        manager.status === 'Active' ? 'text-emerald-500' : 'text-slate-400'
                    }`}>{manager.status === 'Active' ? (isRTL ? 'نشط' : 'Active') : manager.status}</span>
                </div>
            </div>
            
            <div className={`mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <button className="flex-1 py-3 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-slate-900/10 dark:shadow-none">
                    {isRTL ? "إعدادات الوصول" : "Configure Access"}
                </button>
                <button className="px-4 py-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white active:scale-95 transition-all">
                    {isRTL ? "سحب" : "Revoke"}
                </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
