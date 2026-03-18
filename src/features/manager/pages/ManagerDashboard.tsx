"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  ArrowUpRight, 
  MoreVertical,
  Plus,
  ArrowRight,
  ShieldCheck,
  Layers,
  HelpCircle,
  Database,
  Search,
  Activity
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const StatCard = ({ title, value, change, icon: Icon, color, isRTL }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white dark:bg-white/5 p-6 rounded-4xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden"
  >
    <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} w-32 h-32 bg-${color}-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-${color}-500/10 transition-colors duration-500`} />
    
    <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`p-4 rounded-2xl bg-${color}-500/10 text-${color}-600 dark:bg-${color}-500/20 dark:text-${color}-400 group-hover:scale-110 transition-transform duration-500`}>
        <Icon className="w-6 h-6" />
      </div>
      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
    
    <div className={isRTL ? 'text-right' : 'text-left'}>
      <p className="text-sm font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">{title}</p>
      <h3 className="text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tighter">{value}</h3>
      <div className={`flex items-center gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <span className={`flex items-center text-xs font-black px-2 py-1 rounded-lg ${isRTL ? 'flex-row-reverse' : 'flex-row'} ${
          change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
        }`}>
          {change.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
          {change}
        </span>
        <span className="text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest">vs last month</span>
      </div>
    </div>
  </motion.div>
);

const QuickAction = ({ title, icon: Icon, color, isRTL }: any) => (
  <button className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:shadow-lg transition-all duration-300 group ${isRTL ? 'flex-row-reverse' : ''}`}>
    <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 group-hover:scale-110 transition-transform`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className={`flex-1 text-sm font-bold text-slate-700 dark:text-white/70 group-hover:text-slate-900 dark:group-hover:text-white transition-colors uppercase tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>
      {title}
    </span>
    <Plus className={`w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors ${isRTL ? 'rotate-180' : ''}`} />
  </button>
);

const ActivityItem = ({ title, time, type, isRTL }: any) => (
  <div className={`flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 group border border-transparent hover:border-slate-100 dark:hover:border-white/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
    <div className={`w-3 h-3 rounded-full ${
      type === 'create' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 
      type === 'update' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 
      'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
    }`} />
    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
      <p className="text-sm font-bold text-slate-700 dark:text-white/80 group-hover:text-slate-950 dark:group-hover:text-white transition-colors leading-tight">
        {title}
      </p>
      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1 dark:text-white/20">
        {time}
      </p>
    </div>
    <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className={`w-4 h-4 text-indigo-500 ${isRTL ? 'rotate-180' : ''}`} />
    </button>
  </div>
);

export default function ManagerDashboard() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-12">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">{t("mng.system")} Online</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-4">
            {t("mng.dashboard")}
            <span className="text-indigo-500 italic block mt-1 text-2xl opacity-50">Monitoring & Execution</span>
          </h1>
          <p className="text-slate-500 dark:text-white/40 font-medium max-w-md text-sm leading-relaxed">
            Real-time management interface. Monitor platform performance, manage educational resources, and orchestrate system entities.
          </p>
        </div>

        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="relative group">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors ${isRTL ? 'right-4' : 'left-4'}`} />
                <input 
                    type="text" 
                    placeholder="Search resources..."
                    className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-medium w-64 md:w-80 ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                />
            </div>
            <button className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-600 dark:text-white/60 hover:text-indigo-600 hover:border-indigo-500 transition-all shadow-sm">
                <Activity className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title={t("mng.total_users")} value="2,845" change="+12.5%" icon={Users} color="indigo" isRTL={isRTL} />
        <StatCard title={t("mng.active_courses")} value="128" change="+4.2%" icon={BookOpen} color="purple" isRTL={isRTL} />
        <StatCard title={t("mng.completion_rate")} value="76.8%" change="+8.1%" icon={GraduationCap} color="emerald" isRTL={isRTL} />
        <StatCard title={t("mng.revenue")} value="$42,500" change="-1.2%" icon={TrendingUp} color="blue" isRTL={isRTL} />
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
        {/* Performance Graph Placeholder */}
        <div className="lg:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t("mng.performance_overview")}</h3>
              <p className="text-xs font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest mt-1">Platform metrics over time</p>
            </div>
            <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-indigo-600 hover:text-white transition-all">Weekly</button>
                <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">Monthly</button>
            </div>
          </div>
          
          <div className="h-[300px] w-full flex items-end gap-2 md:gap-4 px-2">
            {[40, 70, 45, 90, 65, 80, 55, 95, 75, 85, 60, 100].map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 1, delay: i * 0.05, ease: "circOut" }}
                className="flex-1 bg-linear-to-t from-indigo-500 to-indigo-400 rounded-t-xl opacity-20 hover:opacity-100 transition-opacity relative group cursor-pointer"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                  {h}%
                </div>
              </motion.div>
            ))}
          </div>
          <div className={`flex justify-between mt-6 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>Jan</span>
            <span>Mar</span>
            <span>May</span>
            <span>Jul</span>
            <span>Sep</span>
            <span>Nov</span>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 shadow-sm">
            <h3 className={`text-xl font-black text-slate-900 dark:text-white tracking-tight mb-6 ${isRTL ? 'text-right' : ''}`}>
                {t("mng.quick_actions")}
            </h3>
            <div className="space-y-3">
              <QuickAction title="Add New Student" icon={GraduationCap} color="indigo" isRTL={isRTL} />
              <QuickAction title="Create Program" icon={Layers} color="purple" isRTL={isRTL} />
              <QuickAction title="Launch Quiz" icon={HelpCircle} color="amber" isRTL={isRTL} />
              <QuickAction title="Sync Data" icon={Database} color="emerald" isRTL={isRTL} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 shadow-sm">
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t("mng.recent_activities")}</h3>
              <Activity className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="space-y-1">
              <ActivityItem title="New instructor registration approved" time="2 hours ago" type="create" isRTL={isRTL} />
              <ActivityItem title="Course 'Fullstack React' updated" time="5 hours ago" type="update" isRTL={isRTL} />
              <ActivityItem title="Quiz results processed for 'Security 101'" time="Yesterday" type="success" isRTL={isRTL} />
              <ActivityItem title="System backup completed" time="2 days ago" type="success" isRTL={isRTL} />
            </div>
            <button className="w-full mt-6 py-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-500 hover:border-indigo-500/50 transition-all">
                View All Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
