"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Search, 
  Filter, 
  MoreHorizontal
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const students = [
  { id: 1, name: "Ahmad Al-Sayed", email: "ahmad.s@example.com", courses: 5, avgMark: "92%", lastQuiz: "React Patterns (95%)", status: "Active" },
  { id: 2, name: "Maya Nassar", email: "maya.n@example.com", courses: 3, avgMark: "88%", lastQuiz: "UI/UX Basics (90%)", status: "Active" },
  { id: 3, name: "Omar Kassab", email: "omar.k@example.com", courses: 8, avgMark: "75%", lastQuiz: "Backend Dev (65%)", status: "Warning" },
  { id: 4, name: "Laila Homsi", email: "laila.h@example.com", courses: 2, avgMark: "98%", lastQuiz: "Logic 101 (100%)", status: "Active" },
];

export default function StudentsManagement() {
  const { t, isRTL } = useLanguage();
  return (
    <div className={`p-8 md:p-12 relative min-h-screen selection:bg-indigo-500/30 ${isRTL ? "text-right" : ""}`}>
      <header className="mb-12 relative z-10">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 ${isRTL ? "md:flex-row-reverse" : ""}`}>
          <div>
            <div className={`flex items-center gap-2 text-indigo-500 font-extrabold uppercase tracking-[0.3em] text-[10px] mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <GraduationCap className="w-3 h-3" />
              {t("adm.student_registry")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
              {t("adm.management")} <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-500 to-purple-500">{t("adm.students")}</span>
            </h1>
          </div>
          
          <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="relative group">
                <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/20 group-focus-within:text-indigo-500 transition-colors`} />
                <input 
                    type="text" 
                    placeholder={isRTL ? "البحث عن الطلاب..." : "Search students..."} 
                    className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3 ${isRTL ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm w-[300px] text-slate-900 dark:text-white shadow-sm dark:shadow-none font-medium`}
                />
            </div>
            <button className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
                <Filter className="w-5 h-5 opacity-40 text-slate-900 dark:text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 bg-white dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-[40px] overflow-hidden shadow-sm dark:shadow-none backdrop-blur-3xl">
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse ${isRTL ? "text-right" : ""}`}>
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5">
                <th className={`p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : "text-left"}`}>{isRTL ? "طالب" : "Student"}</th>
                <th className={`p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : "text-left"}`}>{isRTL ? "الحالة" : "Status"}</th>
                <th className={`p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : "text-left"}`}>{t("nav.courses")}</th>
                <th className={`p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : "text-left"}`}>{isRTL ? "متوسط العلامات" : "Avg. Mark"}</th>
                <th className={`p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : "text-left"}`}>{isRTL ? "الأداء الأخير" : "Last Performance"}</th>
                <th className={`p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : "text-left"}`}></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <motion.tr 
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-slate-100/50 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="p-8">
                    <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold uppercase transition-transform group-hover:scale-110">
                            {student.name.charAt(0)}
                        </div>
                        <div className={isRTL ? "text-right" : "text-left"}>
                            <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
                            <p className="text-xs text-slate-400 dark:text-white/20 font-medium">{student.email}</p>
                        </div>
                    </div>
                  </td>
                  <td className="p-8 text-sm">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        student.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                        {student.status === 'Active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'تحذير' : 'Warning')}
                    </span>
                  </td>
                  <td className="p-8 text-sm font-bold text-slate-500 dark:text-white/40">{student.courses}</td>
                  <td className="p-8 text-sm font-black text-indigo-500">{student.avgMark}</td>
                  <td className="p-8">
                    <div className="space-y-1">
                        <p className={`text-sm font-bold text-slate-800 dark:text-slate-200 ${isRTL ? "text-right" : "text-left"}`}>{student.lastQuiz}</p>
                        <div className="w-32 h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: student.avgMark }} />
                        </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className={`flex justify-end ${isRTL ? "flex-row" : "flex-row-reverse"}`}>
                        <button className="p-3 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all opacity-20 hover:opacity-100 text-slate-900 dark:text-white">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
