"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export default function ProfilePage() {
  const { t } = useLanguage();
  
  return (
    <div className='p-12 text-(--foreground) min-h-screen bg-(--background) transition-colors duration-300'>
      <h1 className='text-5xl font-black mb-4 tracking-tighter'>{t("nav.profile")}</h1>
      <p className='opacity-40 text-lg'>Manage your personal information and professional bio.</p>
      
      <div className="mt-12 max-w-2xl">
        <div className="p-8 rounded-[40px] bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center gap-8 mb-8 shadow-sm dark:shadow-none">
            <div className="w-32 h-32 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl shadow-xl text-white">
                YA
            </div>
            <div>
                <h2 className="text-3xl font-black mb-1">Dr. Sarah Al-Sayed</h2>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold mb-4">Senior Technical Instructor</p>
                <button className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl text-sm font-bold transition-all">
                    Edit Profile Photo
                </button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                <span className="text-xs font-black opacity-20 uppercase tracking-widest block mb-1">Email Address</span>
                <span className="font-bold">sarah@afaq.edu</span>
            </div>
            <div className="p-6 rounded-3xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                <span className="text-xs font-black opacity-20 uppercase tracking-widest block mb-1">Location</span>
                <span className="font-bold">Damascus, Syria</span>
            </div>
        </div>
      </div>
    </div>
  );
}
