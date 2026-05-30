"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export default function ProfilePage() {
  const { t } = useLanguage();
  
  return (
    <div className='min-h-screen bg-(--background) p-4 sm:p-6 lg:p-8 text-(--foreground) transition-colors duration-300'>
      <h1 className='mb-4 text-3xl font-black tracking-tighter sm:text-4xl lg:text-5xl'>{t("nav.profile")}</h1>
      <p className='opacity-40 text-lg'>Manage your personal information and professional bio.</p>
      
      <div className="mt-12 max-w-2xl">
        <div className="mb-8 flex flex-col items-start gap-6 rounded-[32px] border border-slate-300 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-white/5 dark:shadow-none sm:flex-row sm:items-center sm:gap-8 sm:p-8 sm:rounded-[40px]">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-3xl text-white shadow-xl sm:h-32 sm:w-32 sm:text-4xl">
                YA
            </div>
            <div>
                <h2 className="mb-1 text-2xl font-black sm:text-3xl">Dr. Sarah Al-Sayed</h2>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold mb-4">Senior Technical Instructor</p>
                <button className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl text-sm font-bold transition-all">
                    Edit Profile Photo
                </button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 shadow-sm dark:shadow-none">
                <span className="text-xs font-black opacity-20 uppercase tracking-widest block mb-1">Email Address</span>
                <span className="font-bold">sarah@afaq.edu</span>
            </div>
            <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 shadow-sm dark:shadow-none">
                <span className="text-xs font-black opacity-20 uppercase tracking-widest block mb-1">Location</span>
                <span className="font-bold">Damascus, Syria</span>
            </div>
        </div>
      </div>
    </div>
  );
}
