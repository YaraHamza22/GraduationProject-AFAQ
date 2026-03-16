"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    "nav.home": "Homescreen",
    "nav.courses": "View My Courses",
    "nav.quizzes": "My Quizes",
    "nav.profile": "Profile",
    "nav.logout": "Logout",
    "dash.welcome": "Welcome back,",
    "dash.subtitle": "Here's what's happening with your courses today.",
    "dash.create": "Create New Course",
    "stats.students": "Total Students",
    "stats.courses": "Active Courses",
    "stats.hours": "Hours Taught",
    "stats.rating": "Avg. Rating",
    "dash.active": "Active Courses",
    "dash.viewall": "View All",
    "dash.tips": "Instructor Tips",
    "dash.boost": "Boost Engagement",
    "dash.boost_desc": "Students are 40% more likely to complete courses with interactive quizzes. Try adding one to your React module!",
    "dash.learnmore": "Learn More",
    "dash.performance": "Course Performance",
    "dash.completion": "Completion Rate",
    "dash.quiz_success": "Quiz Success",
  },
  ar: {
    "nav.home": "الشاشة الرئيسية",
    "nav.courses": "عرض دوراتي",
    "nav.quizzes": "اختباراتي",
    "nav.profile": "الملف الشخصي",
    "nav.logout": "تسجيل الخروج",
    "dash.welcome": "مرحباً بعودتك،",
    "dash.subtitle": "إليك ما يحدث في دوراتك اليوم.",
    "dash.create": "إنشاء دورة جديدة",
    "stats.students": "إجمالي الطلاب",
    "stats.courses": "الدورات النشطة",
    "stats.hours": "ساعات التدريس",
    "stats.rating": "متوسط التقييم",
    "dash.active": "الدورات النشطة",
    "dash.viewall": "عرض الكل",
    "dash.tips": "نصائح للمدرب",
    "dash.boost": "زيادة التفاعل",
    "dash.boost_desc": "الطلاب أكثر عرضة لإكمال الدورات بنسبة 40% عند وجود اختبارات تفاعلية. جرب إضافة واحد إلى وحدة React الخاصة بك!",
    "dash.learnmore": "أعرف أكثر",
    "dash.performance": "أداء الدورة",
    "dash.completion": "معدل الإكمال",
    "dash.quiz_success": "نجاح الاختبار",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations["en"]] || key;
  };

  const isRTL = language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
