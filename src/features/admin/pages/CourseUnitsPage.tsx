"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  Clock,
  Edit3,
  GripVertical,
  Layout,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  X,
  FileText,
  Save,
  ArrowRight,
  Languages,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiBaseUrl, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { extractAdminMessage, getAdminToken } from "@/features/admin/adminSession";

// --- Types ---

type LocalizedText = {
  en: string;
  ar: string;
};

type Unit = {
  id: number | string;
  unit_id?: number | string; // Backend might use unit_id
  course_id: number | string;
  title: LocalizedText | string;
  description: LocalizedText | string;
  title_translations?: LocalizedText;
  description_translations?: LocalizedText;
  unit_order: number;
  actual_duration_minutes: number;
  created_at?: string;
  updated_at?: string;
};

type Course = {
  id: number | string;
  title: LocalizedText;
};

type FormState = {
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  actual_duration_minutes: string;
  unit_order: string;
};

const UNITS_API_PATH = "/super-admin/units";
const COURSES_API_PATH = "/super-admin/courses";

const initialForm: FormState = {
  title_en: "",
  title_ar: "",
  description_en: "",
  description_ar: "",
  actual_duration_minutes: "30",
  unit_order: "1",
};

// --- Helpers ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getLocalizedValue(value: unknown, locale: "en" | "ar", fallbackLocale: "en" | "ar" = "en") {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";

  const localized = getStringValue(value[locale]);
  if (localized) return localized;

  const fallback = getStringValue(value[fallbackLocale]);
  return fallback;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return "Cannot reach server. Please check your connection.";
  const msg = error.response.data?.message;
  return typeof msg === "string" ? msg : fallback;
}

// --- Component ---

export default function CourseUnitsPage() {
  const { isRTL, language } = useLanguage();
  const currentLocale = language as "en" | "ar";
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  // Data State
  const [units, setUnits] = useState<Unit[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Form State
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState | "title" | "description", string>>>({});

  const getHeaders = useCallback((locale?: string) => {
    const token = getAdminToken();
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(locale ? { "Accept-Language": locale, "X-Locale": locale } : {}),
    };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      // Fetch course details to verify it exists and get title
      const courseRes = await axios.get(getAdminApiRequestUrl(`${COURSES_API_PATH}/${courseId}`), { headers: getHeaders(currentLocale) });
      const fetchedCourse = courseRes.data?.data || courseRes.data;
      setCourse(fetchedCourse);

      // Use the dedicated by-course endpoint for fetching units
      try {
        const unitsRes = await axios.get(getAdminApiRequestUrl(`${UNITS_API_PATH}/course/${courseId}`), {
          headers: getHeaders(currentLocale),
        });
        const extractData = (r: any) => r.data?.data?.data || r.data?.data || r.data || [];
        const unitsData = extractData(unitsRes);
        setUnits(Array.isArray(unitsData) ? unitsData : []);
      } catch {
        // Fallback: try units from course response or fetch all and filter
        if (fetchedCourse.units && Array.isArray(fetchedCourse.units)) {
          setUnits(fetchedCourse.units);
        } else {
          const unitsRes = await axios.get(getAdminApiRequestUrl(UNITS_API_PATH), { 
            headers: getHeaders(currentLocale),
            params: { course_id: courseId, locale: currentLocale },
          });
          const allUnits = unitsRes.data?.data?.data || unitsRes.data?.data || unitsRes.data || [];
          setUnits(Array.isArray(allUnits) ? allUnits.filter((u: any) => String(u.course_id) === String(courseId)) : []);
        }
      }
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to load units."));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, currentLocale, getHeaders]);

  useEffect(() => {
    if (courseId) void loadData();
  }, [courseId, loadData]);

  const openCreateModal = () => {
    setForm({ ...initialForm, unit_order: String(units.length + 1) });
    setModalMode("create");
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    // API returns title as a translated string, and title_translations as {en, ar}
    const titleTrans = unit.title_translations || (typeof unit.title === 'object' ? unit.title : { en: String(unit.title), ar: '' });
    const descTrans = unit.description_translations || (typeof unit.description === 'object' ? unit.description : { en: String(unit.description), ar: '' });
    setForm({
      title_en: titleTrans.en || '',
      title_ar: titleTrans.ar || '',
      description_en: descTrans.en || '',
      description_ar: descTrans.ar || '',
      actual_duration_minutes: String(unit.actual_duration_minutes),
      unit_order: String(unit.unit_order),
    });
    setModalMode("edit");
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const payload = {
        course_id: Number(courseId),
        title: { en: form.title_en, ar: form.title_ar },
        description: { en: form.description_en, ar: form.description_ar },
        actual_duration_minutes: Number(form.actual_duration_minutes),
        unit_order: Number(form.unit_order),
      };

      if (modalMode === "create") {
        await axios.post(getAdminApiRequestUrl(UNITS_API_PATH), payload, { headers: getHeaders(currentLocale) });
        setSuccessMessage("Unit created successfully!");
      } else if (editingUnit) {
        const unitId = editingUnit.unit_id || editingUnit.id;
        await axios.put(getAdminApiRequestUrl(`${UNITS_API_PATH}/${unitId}`), payload, { headers: getHeaders(currentLocale) });
        setSuccessMessage("Unit updated successfully!");
      }

      setIsModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const newFieldErrors: any = {};
        Object.keys(errors).forEach(key => {
          const mappedKey = key.replace(".", "_");
          newFieldErrors[mappedKey] = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
        });
        setFieldErrors(newFieldErrors);
      } else {
        setListError(getErrorMessage(error, "Operation failed."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUnit = async (id: number | string) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;
    try {
      await axios.delete(getAdminApiRequestUrl(`${UNITS_API_PATH}/${id}`), { headers: getHeaders(currentLocale) });
      setSuccessMessage("Unit deleted successfully!");
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to delete unit."));
    }
  };

  return (
    <div className={`p-4 md:p-12 2xl:p-20 min-h-screen bg-slate-50 dark:bg-transparent transition-colors duration-500 ${isRTL ? "text-right" : ""}`}>
      {/* Background Glow */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-[1600px] 2xl:max-w-[2000px] mx-auto relative z-10">
        {/* Breadcrumbs / Back */}
        <button 
          onClick={() => router.push("/admin/courses")}
          className={`flex items-center gap-3 text-slate-400 hover:text-indigo-500 transition-all mb-12 group ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:border-indigo-500/50 transition-all shadow-sm">
            <ChevronLeft className={`w-5 h-5 transition-transform group-hover:-translate-x-1 ${isRTL ? "rotate-180 group-hover:translate-x-1" : ""}`} />
          </div>
          <span className="font-black uppercase tracking-[0.2em] text-[10px] md:text-[11px]">Back to Courses</span>
        </button>

        {/* Header */}
        <header className={`flex flex-col xl:flex-row xl:items-end justify-between gap-10 mb-16 md:mb-24 ${isRTL ? "xl:flex-row-reverse" : ""}`}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`flex items-center gap-3 text-indigo-500 font-black uppercase tracking-[0.4em] text-[10px] md:text-[12px] mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <BookOpen className="w-4 h-4" />
              Architectural Layer
            </div>
            <h1 className="text-5xl md:text-7xl 2xl:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.9]">
              Curriculum <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">Inventory</span>
            </h1>
            {course && (
              <div className={`mt-8 flex items-center gap-4 p-4 md:p-6 rounded-[32px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 w-fit shadow-xl shadow-slate-900/5 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Layout className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active Course Context</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{getLocalizedValue(course.title, currentLocale)}</p>
                </div>
              </div>
            )}
          </motion.div>

          <div className={`flex flex-wrap items-center gap-4 md:gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button 
              onClick={() => void loadData()}
              className="p-5 md:p-6 rounded-[28px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-indigo-500/10 hover:text-indigo-500 transition-all shadow-xl shadow-slate-900/5"
            >
              <RefreshCw className={`w-6 h-6 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={openCreateModal}
              className="flex items-center gap-4 px-8 md:px-12 py-5 md:py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-[11px] md:text-[12px] shadow-2xl shadow-indigo-500/40 transition-all hover:-translate-y-2 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Initialize Unit
            </button>
          </div>
        </header>

        {/* Notifications */}
        <AnimatePresence>
          {successMessage && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="mb-10 p-6 md:p-8 rounded-[36px] bg-emerald-500 text-white shadow-2xl shadow-emerald-500/30 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <BadgeCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-black tracking-tight">{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
          {listError && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="mb-10 p-6 md:p-8 rounded-[36px] bg-rose-500 text-white shadow-2xl shadow-rose-500/30 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-black tracking-tight">{listError}</span>
              </div>
              <button onClick={() => setListError(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Units List */}
        <div className="grid grid-cols-1 gap-6 md:gap-8">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-32 md:h-40 rounded-[48px] bg-white dark:bg-white/5 animate-pulse border border-slate-200 dark:border-white/5 shadow-sm" />
            ))
          ) : units.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-32 md:py-48 bg-white dark:bg-white/3 rounded-[64px] border-2 border-dashed border-slate-200 dark:border-white/10"
            >
              <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                <Layout className="w-12 h-12 text-slate-300 dark:text-white/10" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">Void Curriculum</h3>
              <p className="text-lg text-slate-500 dark:text-white/40 max-w-md mx-auto font-medium">The course architecture is currently empty. Begin by initializing the first structural unit.</p>
              <button 
                onClick={openCreateModal}
                className="mt-10 px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] transition-all hover:scale-105"
              >
                Launch First Unit
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:gap-10">
              {units.sort((a, b) => a.unit_order - b.unit_order).map((unit, idx) => (
                <motion.div 
                  key={unit.id || unit.unit_id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`group relative flex flex-col md:flex-row items-center gap-8 p-8 md:p-10 bg-white dark:bg-white/3 border border-slate-200 dark:border-white/5 rounded-[48px] hover:border-indigo-500/30 transition-all hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-1 ${isRTL ? "md:flex-row-reverse" : ""}`}
                >
                  <div className={`flex items-center gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-white/10 group-hover:text-indigo-500 transition-colors">
                      <GripVertical className="w-7 h-7 cursor-grab active:cursor-grabbing" />
                    </div>
                    <div className="relative">
                      <div className="w-16 h-16 rounded-[24px] bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner group-hover:shadow-indigo-500/40">
                        {unit.unit_order}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black shadow-lg">
                        <BadgeCheck className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  <div className={`flex-1 ${isRTL ? "text-right" : "text-left"} w-full`}>
                    <div className={`flex flex-wrap items-center gap-4 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-500 transition-colors">
                        {getLocalizedValue(unit.title, currentLocale)}
                      </h3>
                      <div className="px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                        Unit Module
                      </div>
                    </div>
                    
                    <div className={`flex flex-wrap items-center gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        {unit.actual_duration_minutes} Mins
                      </span>
                      <p className="text-sm md:text-base text-slate-500 dark:text-white/30 line-clamp-2 max-w-2xl leading-relaxed font-medium">
                        {getLocalizedValue(unit.description, currentLocale) || "System pending architectural description for this structural unit module."}
                      </p>
                    </div>
                  </div>

                  <div className={`flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end ${isRTL ? "flex-row-reverse" : ""}`}>
                    <button 
                      onClick={() => openEditModal(unit)}
                      className="p-5 rounded-[24px] bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all active:scale-90"
                    >
                      <Edit3 className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => deleteUnit(unit.unit_id || unit.id)}
                      className="p-5 rounded-[24px] bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => router.push(`/admin/courses/${courseId}/units/${unit.unit_id || unit.id}/lessons`)}
                      className="flex items-center gap-3 px-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                    >
                      Explore Lessons
                      <ArrowRight className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 50 }}
              className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl bg-white dark:bg-[#0A0F1D] md:rounded-[56px] overflow-hidden shadow-2xl border-t md:border border-slate-200 dark:border-white/10"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full md:max-h-[90vh]">
                <header className={`p-8 md:p-12 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/2 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <div className={`flex items-center gap-2 text-indigo-500 font-black uppercase tracking-[0.3em] text-[10px] mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Settings className="w-3 h-3" />
                      Unit Definition
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      {modalMode === "create" ? "Append Module" : "Refine Module"}
                    </h2>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 rounded-3xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-500 transition-all active:scale-90">
                    <X className="w-8 h-8" />
                  </button>
                </header>

                <div className="p-8 md:p-12 space-y-10 overflow-y-auto custom-scrollbar">
                  {/* Title Fields */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Unit Identifier (English)</label>
                      <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 ${fieldErrors.title_en ? "border-rose-500/50" : "border-transparent focus-within:border-indigo-500/30"} transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                        <FileText className="w-6 h-6 text-indigo-500" />
                        <input 
                          type="text" 
                          value={form.title_en}
                          onChange={(e) => setForm({...form, title_en: e.target.value})}
                          className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-xl placeholder:text-slate-400 dark:placeholder:text-white/10 ${isRTL ? "text-right" : ""}`}
                          placeholder="e.g. System Core Concepts"
                        />
                      </div>
                      {fieldErrors.title_en && <p className="text-xs font-bold text-rose-500 pl-4">{fieldErrors.title_en}</p>}
                    </div>
                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>مسمى الوحدة (العربية)</label>
                      <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 ${fieldErrors.title_ar ? "border-rose-500/50" : "border-transparent focus-within:border-indigo-500/30"} transition-all flex-row-reverse`}>
                        <Languages className="w-6 h-6 text-indigo-500" />
                        <input 
                          type="text" 
                          dir="rtl"
                          value={form.title_ar}
                          onChange={(e) => setForm({...form, title_ar: e.target.value})}
                          className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-xl placeholder:text-slate-400 dark:placeholder:text-white/10 text-right"
                          placeholder="مثال: المفاهيم الأساسية للنظام"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description Fields */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Mission Narrative (English)</label>
                      <textarea 
                        rows={6}
                        value={form.description_en}
                        onChange={(e) => setForm({...form, description_en: e.target.value})}
                        placeholder="Detail the purpose of this curriculum module..."
                        className={`w-full p-8 rounded-[40px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/30 outline-none text-slate-900 dark:text-white font-bold leading-relaxed transition-all resize-none ${isRTL ? "text-right" : ""}`}
                      />
                    </div>
                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>وصف المهمة (العربية)</label>
                      <textarea 
                        rows={6}
                        dir="rtl"
                        value={form.description_ar}
                        onChange={(e) => setForm({...form, description_ar: e.target.value})}
                        placeholder="فصّل الغرض من هذه الوحدة التعليمية..."
                        className="w-full p-8 rounded-[40px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/30 outline-none text-slate-900 dark:text-white font-bold leading-relaxed transition-all resize-none text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-10">
                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Temporal Scale (Minutes)</label>
                      <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all shadow-inner ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                          <Clock className="w-6 h-6" />
                        </div>
                        <input 
                          type="number" 
                          value={form.actual_duration_minutes}
                          onChange={(e) => setForm({...form, actual_duration_minutes: e.target.value})}
                          className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-2xl ${isRTL ? "text-right" : ""}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Curriculum Sequence Index</label>
                      <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all shadow-inner ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                          <Settings className="w-6 h-6" />
                        </div>
                        <input 
                          type="number" 
                          value={form.unit_order}
                          onChange={(e) => setForm({...form, unit_order: e.target.value})}
                          className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-2xl ${isRTL ? "text-right" : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <footer className={`p-8 md:p-12 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-4 bg-slate-50/50 dark:bg-white/2 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="px-10 py-5 rounded-[24px] md:rounded-[32px] border-2 border-slate-200 dark:border-white/10 font-black uppercase tracking-widest text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                    Abort Entry
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] md:rounded-[32px] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-500/40 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                    {modalMode === "create" ? "Append Module to Grid" : "Commit Module Refinement"}
                  </button>
                </footer>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.1);
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
