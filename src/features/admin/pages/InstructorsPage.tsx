"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ExternalLink,
  MessageSquare,
  BarChart2
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const instructors = [
  { id: 1, name: "Dr. Hassan Ali", specialization: "Computer Science", courses: 12, quizzes: 45, status: "Active", joined: "Jan 2025" },
  { id: 2, name: "Eng. Lana Saoud", specialization: "UI/UX Design", courses: 8, quizzes: 32, status: "Pending", joined: "Mar 2026" },
  { id: 3, name: "Prof. Samer Issa", specialization: "Mathematics", courses: 15, quizzes: 60, status: "Active", joined: "Dec 2024" },
  { id: 4, name: "Dr. Nour Al-Huda", specialization: "Artificial Intelligence", courses: 5, quizzes: 18, status: "Pending", joined: "Apr 2026" },
];

export default function InstructorsManagement() {
  const { t, isRTL } = useLanguage();
  return (
    <div className={`p-8 md:p-12 relative min-h-screen ${isRTL ? "text-right" : ""}`}>
      <header className="mb-12 relative z-10">
        <div className={`flex items-center gap-2 text-indigo-500 font-extrabold uppercase tracking-[0.3em] text-[10px] mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Users className="w-3 h-3" />
          {t("adm.faculty_admin")}
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
          {t("adm.management")} <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-500 to-purple-500">{t("adm.instructors")}</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-6 relative z-10 font-bold">
        {instructors.map((inst, idx) => (
          <motion.div
            key={inst.id}
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`group p-8 rounded-[40px] bg-white dark:bg-white/3 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:border-indigo-500/30 shadow-sm dark:shadow-none backdrop-blur-3xl ${isRTL ? "md:flex-row-reverse" : ""}`}
          >
            <div className={`flex items-center gap-6 ${isRTL ? "flex-row-reverse text-right" : "text-left"}`}>
                <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-110">
                    {inst.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{inst.name}</h3>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/20 mb-2">{inst.specialization}</p>
                    <div className={`flex items-center gap-4 text-[10px] font-black uppercase text-slate-500 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span className="flex items-center gap-1.5"><BarChart2 className="w-3 h-3" /> {inst.courses} {t("stats.courses")}</span>
                        <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> {inst.quizzes} {t("nav.quizzes")}</span>
                    </div>
                </div>
            </div>

            <div className={`flex flex-col items-center md:items-end gap-2 ${isRTL ? "md:items-start" : ""}`}>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    inst.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                    {inst.status === 'Active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معلق' : 'Pending')}
                </span>
                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock className="w-3 h-3" /> {isRTL ? 'انضم' : 'Joined'} {inst.joined}
                </p>
            </div>

            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                {inst.status === 'Pending' ? (
                   <>
                    <button className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" /> {isRTL ? 'موافقة' : 'Approve'}
                    </button>
                    <button className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-rose-500 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95">
                        <XCircle className="w-4 h-4" /> {isRTL ? 'رفض' : 'Decline'}
                    </button>
                   </>
                ) : (
                    <button className="flex items-center gap-2 bg-slate-950 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-900/10 dark:shadow-none">
                        <ExternalLink className="w-4 h-4" /> {isRTL ? 'عرض الملف' : 'View Profile'}
                    </button>
                )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
