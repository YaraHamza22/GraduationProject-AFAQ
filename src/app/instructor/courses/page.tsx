"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export default function CoursesPage() {
  const { t } = useLanguage();
  
  return (
    <div className='p-12 text-(--foreground) min-h-screen bg-(--background) transition-colors duration-300'>
      <h1 className='text-5xl font-black mb-4 tracking-tighter'>{t("nav.courses")}</h1>
      <p className='opacity-40 text-lg'>Management dashboard for all your curated educational content.</p>
      <div className="mt-12 p-24 rounded-[40px] border border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-center">
         <div className="w-20 h-20 rounded-3xl bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-6">
            <span className="text-4xl opacity-20">📚</span>
         </div>
         <h2 className="text-2xl font-bold mb-2">No courses to display yet</h2>
         <p className="opacity-40 max-w-xs">Start creating your first course and share your knowledge with the world.</p>
      </div>
    </div>
  );
}
