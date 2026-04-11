"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
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
    "std.dashboard": "My Dashboard",
    "std.courses": "Enrolled Courses",
    "std.quizzes": "My Quizzes",
    "std.certificates": "My Certificates",
    "std.marks": "Recent Marks",
    "std.progress": "Learning Progress",
    "std.active": "Active Courses",
    "std.welcome": "Welcome back,",
    "std.subtitle": "Continue your learning journey.",
    "adm.portal": "Admin Portal",
    "adm.dashboard": "Home Dashboard",
    "adm.overview": "Overview",
    "adm.management": "Management",
    "adm.students": "Students",
    "adm.instructors": "Instructors",
    "adm.all_instructors": "All Instructors",
    "adm.course_category": "Course Category",
    "adm.managers": "Managers",
    "adm.secure_id": "Secure Identifier",
    "adm.encrypted_pass": "Encrypted Pass",
    "adm.init_auth": "Initialize Authorization",
    "adm.return": "Return to Gateway",
    "adm.sys_control": "System Control Center",
    "adm.central_hub": "Central hub for platform analytics and oversight.",
    "adm.total_students": "Total Students",
    "adm.active_instructors": "Active Instructors",
    "adm.pending_approvals": "Pending Approvals",
    "adm.global_success_rate": "Global Success Rate",
    "adm.growth": "Platform Growth",
    "adm.realtime": "Real-time engagement metrics",
    "adm.sys_status": "System Status",
    "adm.status_desc": "All core systems are operational. Quantum Encryption layer is active.",
    "adm.security_prot": "Security Protocols",
    "adm.recent_events": "Recent Critical Events",
    "adm.student_registry": "Student Registry",
    "adm.faculty_admin": "Faculty Administration",
    "adm.security_gov": "Security Governance",
    "mng.dashboard": "Manager Dashboard",
    "mng.platform": "Platform",
    "mng.academic": "Academic",
    "mng.assessment": "Assessment",
    "mng.system": "System",
    "mng.students": "Students",
    "mng.instructors": "Instructors",
    "mng.auditors": "Auditors",
    "mng.programs": "Programs",
    "mng.courses": "Courses",
    "mng.units": "Units",
    "mng.lessons": "Lessons",
    "mng.quizzes": "Quizzes",
    "mng.questions": "Questions",
    "mng.options": "Options",
    "mng.attempts": "Attempts",
    "mng.answers": "Answers",
    "mng.total_users": "Total Users",
    "mng.active_courses": "Active Courses",
    "mng.completion_rate": "Completion Rate",
    "mng.revenue": "Revenue",
    "mng.recent_activities": "Recent Activities",
    "mng.performance_overview": "Performance Overview",
    "mng.quick_actions": "Quick Actions"
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
    "std.dashboard": "لوحة التحكم",
    "std.courses": "دوراتي المسجلة",
    "std.quizzes": "اختباراتي",
    "std.certificates": "شهاداتي",
    "std.marks": "الدرجات الأخيرة",
    "std.progress": "تقدمي الدراسي",
    "std.active": "الدورات النشطة",
    "std.welcome": "مرحباً بك مجدداً،",
    "std.subtitle": "لنكمل رحلتك التعليمية.",
    "adm.portal": "بوابة المسؤول",
    "adm.dashboard": "لوحة القيادة الرئيسية",
    "adm.overview": "نظرة عامة",
    "adm.management": "الإدارة",
    "adm.students": "الطلاب",
    "adm.instructors": "المدربون",
    "adm.all_instructors": "جميع المدربين",
    "adm.course_category": "تصنيف الدورة",
    "adm.managers": "المدراء",
    "adm.secure_id": "المعرف الآمن",
    "adm.encrypted_pass": "كلمة المرور المشفرة",
    "adm.init_auth": "بدء عملية المصادقة",
    "adm.return": "العودة إلى البوابة",
    "adm.sys_control": "مركز التحكم بالصيانة",
    "adm.central_hub": "المركز الرئيسي لتحليلات المنصة والرقابة.",
    "adm.total_students": "إجمالي الطلاب",
    "adm.active_instructors": "المدربون النشطون",
    "adm.pending_approvals": "الموافقات المعلقة",
    "adm.global_success_rate": "معدل النجاح العالمي",
    "adm.growth": "نمو المنصة",
    "adm.realtime": "مقاييس التفاعل في الوقت الفعلي",
    "adm.sys_status": "حالة النظام",
    "adm.status_desc": "جميع الأنظمة الأساسية تعمل. طبقة التشفير الكمي نشطة.",
    "adm.security_prot": "بروتوكولات الأمان",
    "adm.recent_events": "الأحداث الهامة الأخيرة",
    "adm.student_registry": "سجل الطلاب",
    "adm.faculty_admin": "إدارة الهيئة التدريسية",
    "adm.security_gov": "حوكمة الأمن",
    "mng.dashboard": "لوحة تحكم المدير",
    "mng.platform": "المنصة",
    "mng.academic": "الأكاديمية",
    "mng.assessment": "التقييم",
    "mng.system": "النظام",
    "mng.students": "الطلاب",
    "mng.instructors": "المدربون",
    "mng.auditors": "المدققون",
    "mng.programs": "البرامج",
    "mng.courses": "الدورات",
    "mng.units": "الوحدات",
    "mng.lessons": "الدروس",
    "mng.quizzes": "الاختبارات",
    "mng.questions": "الأسئلة",
    "mng.options": "الخيارات",
    "mng.attempts": "المحاولات",
    "mng.answers": "الإجابات",
    "mng.total_users": "إجمالي المستخدمين",
    "mng.active_courses": "الدورات النشطة",
    "mng.completion_rate": "معدل الإكمال",
    "mng.revenue": "الإيرادات",
    "mng.recent_activities": "الأنشطة الأخيرة",
    "mng.performance_overview": "نظرة عامة على الأداء",
    "mng.quick_actions": "إجراءات سريعة"
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string) => {
    return translations[language][key] || key;
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
