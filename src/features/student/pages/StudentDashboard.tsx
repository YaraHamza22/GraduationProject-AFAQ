"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Target, 
  Layout, 
  Award,
  ChevronRight,
  TrendingUp,
  Clock,
  ExternalLink
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const studentStats = [
  { id: 1, label: "std.courses", value: "4", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: 2, label: "std.progress", value: "72%", icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: 3, label: "std.quizzes", value: "12", icon: Layout, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: 4, label: "std.certificates", value: "2", icon: Award, color: "text-amber-500", bg: "bg-amber-500/10" },
];

const activeCourses = [
  { id: 1, name: "Advanced Web Development", instructor: "Dr. Sarah", progress: 85, image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80" },
  { id: 2, name: "UI/UX Foundations", instructor: "Prof. Ahmed", progress: 45, image: "https://images.unsplash.com/photo-1545235617-9462d1a3d68f?w=800&q=80" },
];

export default function StudentDashboard() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="flex-1 p-8 md:p-12 bg-(--background) min-h-screen text-(--foreground) overflow-hidden relative transition-colors duration-300">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-600/5 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2" />

      {/* Header Section */}
      <div className="relative z-10 mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-black tracking-tighter mb-4"
        >
          {t("std.welcome")} <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Karam</span> 👋
        </motion.h1>
        <p className="opacity-40 text-xl max-w-xl leading-relaxed">
          {t("std.subtitle")}
        </p>
      </div>

      {/* 1. Stats Overview (Grid 1-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
        {studentStats.map((stat, idx) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-8 rounded-[40px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden active:scale-95"
          >
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="opacity-40 font-bold text-sm uppercase tracking-widest mb-1">{t(stat.label)}</p>
            <h3 className="text-4xl font-black">{stat.value}</h3>
            
            {/* Subtle path line decoration */}
            <div className={`absolute bottom-0 left-0 h-1 bg-linear-to-r from-transparent via-blue-500/20 to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
        {/* 2. Active Courses Section */}
        <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tighter">{t("std.active")}</h2>
                <button className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold group">
                    {t("dash.viewall")} <ChevronRight className={`w-5 h-5 transition-transform ${isRTL ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {activeCourses.map((course, idx) => (
                    <motion.div
                        key={course.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + idx * 0.1 }}
                        className="group p-2 rounded-[32px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 shadow-sm hover:shadow-xl transition-all overflow-hidden"
                    >
                        <div className="relative h-48 rounded-[24px] overflow-hidden mb-6">
                            <img src={course.image} alt={course.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end p-6">
                                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-lg uppercase tracking-tighter">In Progress</span>
                            </div>
                        </div>
                        <div className="px-4 pb-6">
                            <h4 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-none">{course.name}</h4>
                            <p className="text-sm opacity-40 mb-6 font-medium">By {course.instructor}</p>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-bold uppercase tracking-tighter">
                                    <span className="opacity-40">{t("dash.completion")}</span>
                                    <span>{course.progress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${course.progress}%` }}
                                        className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* 3. Performance (Right Sidebar) and 4. Recent Marks/Certificates Placeholder */}
        <div className="space-y-8">
             <h2 className="text-3xl font-black tracking-tighter">Performance</h2>
             <div className="p-8 rounded-[40px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold leading-none text-xl uppercase tracking-tighter">Growth</h4>
                        <p className="text-sm opacity-40 font-medium">+12% this month</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {[
                        { label: "Attendance", value: 94, color: "bg-emerald-500" },
                        { label: "Assignment Score", value: 88, color: "bg-blue-600" },
                        { label: "Interaction", value: 76, color: "bg-purple-600" },
                    ].map((metric) => (
                        <div key={metric.label} className="space-y-2">
                            <div className="flex justify-between text-sm font-bold uppercase tracking-tighter">
                                <span className="opacity-40">{metric.label}</span>
                                <span>{metric.value}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full">
                                <div className={`h-full ${metric.color} rounded-full`} style={{ width: `${metric.value}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* Recent Activity / Next Class */}
             <div className="p-8 rounded-[40px] bg-linear-to-br from-indigo-700 to-purple-800 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                <Clock className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:rotate-12 transition-transform duration-500" />
                <h4 className="text-2xl font-black mb-4 uppercase tracking-tighter">Upcoming Quiz</h4>
                <p className="opacity-80 mb-8 font-medium leading-relaxed uppercase text-sm tracking-tight">Full-Stack Architecture - Sunday, 10:00 AM</p>
                <button className="flex items-center gap-2 px-6 py-4 bg-white text-indigo-700 rounded-2xl font-black shadow-lg hover:scale-105 transition-all text-xs uppercase tracking-widest italic">
                   <ExternalLink className="w-4 h-4" />
                   Review Notes
                </button>
             </div>
        </div>
      </div>
    </div>
  );
}
