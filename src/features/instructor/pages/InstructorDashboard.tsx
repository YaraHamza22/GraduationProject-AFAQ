"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Plus, 
  ChevronRight,
  Star,
  Zap
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const stats = [
  { label: "stats.students", value: "1,284", icon: Users, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
  { label: "stats.courses", value: "12", icon: BookOpen, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10" },
  { label: "stats.hours", value: "482", icon: Clock, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "stats.rating", value: "4.9", icon: Star, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10" },
];

const recentCourses = [
  { name: "Advanced React Patterns", students: 124, progress: 85, image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80" },
  { name: "UI/UX Design Masterclass", students: 89, progress: 62, image: "https://images.unsplash.com/photo-1541462608141-ad4d05ed08c3?w=800&q=80" },
  { name: "Node.js Backend Architecture", students: 56, progress: 45, image: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80" },
];

export default function InstructorDashboard() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="flex-1 p-8 md:p-12 bg-(--background) min-h-screen text-(--foreground) overflow-hidden relative transition-colors duration-300">
      {/* Abstract Background Blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black tracking-tighter mb-2"
          >
            {t("dash.welcome")} <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400">Dr. Sarah</span> 👋
          </motion.h1>
          <p className="opacity-40 text-lg">{t("dash.subtitle")}</p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-2xl font-bold shadow-[0_10px_20px_rgba(79,70,229,0.3)] transition-all w-fit"
        >
          <Plus className="w-5 h-5" />
          {t("dash.create")}
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 rounded-[32px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 backdrop-blur-xl relative group overflow-hidden shadow-sm dark:shadow-none"
          >
            <div className={`absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700`}>
                <stat.icon className={`w-24 h-24 ${stat.color}`} />
            </div>
            
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-6`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="opacity-40 font-semibold text-sm mb-1 uppercase tracking-wider">{t(stat.label)}</p>
            <h3 className="text-3xl font-black">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Main Section: Courses */}
        <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">{t("dash.active")}</h2>
                <button className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:opacity-80 flex items-center gap-1 group">
                    {t("dash.viewall")} <ChevronRight className={`w-4 h-4 transition-transform ${isRTL ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </button>
            </div>

            <div className="space-y-4">
                {recentCourses.map((course, idx) => (
                    <motion.div 
                        key={course.name}
                        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.1 }}
                        className="group p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 hover:border-indigo-500/30 hover:shadow-md dark:hover:bg-white/10 transition-all flex items-center gap-6 shadow-sm dark:shadow-none"
                    >
                        <div className="w-24 h-20 rounded-2xl overflow-hidden shrink-0">
                            <img src={course.image} alt={course.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold mb-1 truncate">{course.name}</h4>
                            <div className="flex items-center gap-4 text-sm opacity-40">
                                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {course.students} {t("stats.students")}</span>
                                <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">{course.progress}%</span>
                            </div>
                        </div>
                        <button className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <ChevronRight className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Sidebar: Activity/Tips */}
        <div className="space-y-8">
             <h2 className="text-2xl font-bold tracking-tight">{t("dash.tips")}</h2>
             <div className="p-8 rounded-[40px] bg-linear-to-br from-indigo-600 to-purple-700 relative overflow-hidden group shadow-xl">
                 <Zap className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 group-hover:rotate-12 transition-transform duration-500" />
                 <h4 className="text-xl font-black mb-4 relative z-10 text-white">{t("dash.boost")}</h4>
                 <p className="text-white/80 leading-relaxed mb-6 relative z-10">
                    {t("dash.boost_desc")}
                 </p>
                 <button className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-sm relative z-10 shadow-lg hover:shadow-xl transition-all">
                     {t("dash.learnmore")}
                 </button>
             </div>

             <div className="p-6 rounded-[32px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 shadow-sm dark:shadow-none">
                 <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                     <TrendingUp className="w-5 h-5 text-emerald-500" />
                     {t("dash.performance")}
                 </h4>
                 <div className="space-y-6">
                     {[
                         { label: "dash.completion", value: 78 },
                         { label: "dash.quiz_success", value: 92 },
                     ].map((metric) => (
                         <div key={metric.label} className="space-y-2">
                             <div className="flex justify-between text-sm font-bold">
                                 <span className="opacity-60">{t(metric.label)}</span>
                                 <span>{metric.value}%</span>
                             </div>
                             <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${metric.value}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full"
                                 />
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
