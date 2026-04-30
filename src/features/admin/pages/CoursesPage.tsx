"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  BookOpen,
  Calendar,
  Clock,
  Edit3,
  Eye,
  GraduationCap,
  Languages,
  Layers,
  Layout,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  X,
  ChevronRight,
  Globe,
  MonitorPlay,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiBaseUrl, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { extractAdminMessage, getAdminToken } from "@/features/admin/adminSession";

// --- Types ---

type LocalizedText = {
  en: string;
  ar: string;
};

type Course = {
  id: number | string;
  course_category_id: number;
  title: LocalizedText;
  description: LocalizedText;
  objectives: LocalizedText;
  prerequisites: LocalizedText;
  actual_duration_hours: number;
  language: string;
  status: "published" | "archived" | "draft" | string;
  min_score_to_pass: number;
  is_offline_available: boolean;
  course_delivery_type: "self_paced" | "instructor_led" | string;
  difficulty_level: "beginner" | "intermediate" | "advanced" | string;
  category?: {
    id: number;
    name: LocalizedText | string;
  };
  title_translations?: LocalizedText;
  description_translations?: LocalizedText;
  objectives_translations?: LocalizedText;
  prerequisites_translations?: LocalizedText;
  created_at?: string;
  updated_at?: string;
  cover_url?: string;
};

type FormState = {
  course_category_id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  objectives_en: string;
  objectives_ar: string;
  prerequisites_en: string;
  prerequisites_ar: string;
  actual_duration_hours: string;
  language: string;
  status: string;
  min_score_to_pass: string;
  is_offline_available: boolean;
  course_delivery_type: string;
  difficulty_level: string;
};

type Category = {
  id: number;
  name: string | LocalizedText;
};

type Instructor = {
  id: number | string;
  instructor_id?: number | string;
  user_id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type FieldName = keyof FormState | "title" | "description" | "objectives" | "prerequisites";
type FieldErrors = Partial<Record<FieldName, string>>;
type ModalMode = "create" | "edit" | "view";

const API_PATH = "/super-admin/courses";
const CATEGORIES_API_PATH = "/super-admin/course-categories";
const initialForm: FormState = {
  course_category_id: "",
  title_en: "",
  title_ar: "",
  description_en: "",
  description_ar: "",
  objectives_en: "",
  objectives_ar: "",
  prerequisites_en: "",
  prerequisites_ar: "",
  actual_duration_hours: "",
  language: "en",
  status: "published",
  min_score_to_pass: "60",
  is_offline_available: false,
  course_delivery_type: "self_paced",
  difficulty_level: "beginner",
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

function getLocalizedInputPair(
  value: unknown,
  translations: unknown,
  activeLocale: "en" | "ar"
) {
  const translatedEn = getLocalizedValue(translations, "en");
  const translatedAr = getLocalizedValue(translations, "ar");
  if (translatedEn || translatedAr) {
    return { en: translatedEn, ar: translatedAr };
  }

  const objectEn = getLocalizedValue(value, "en");
  const objectAr = getLocalizedValue(value, "ar");
  if (objectEn || objectAr) {
    return { en: objectEn, ar: objectAr };
  }

  const single = getStringValue(value).trim();
  if (!single) return { en: "", ar: "" };
  return activeLocale === "ar" ? { en: "", ar: single } : { en: single, ar: "" };
}

function getInstructorIdValue(inst: Instructor) {
  return inst.id ?? inst.instructor_id ?? inst.user_id;
}

function extractInstructorsFromPayload(payload: any): Instructor[] {
  const direct = payload?.data?.data ?? payload?.data ?? payload ?? [];
  if (Array.isArray(direct)) return direct;
  if (Array.isArray(direct?.instructors)) return direct.instructors;
  if (Array.isArray(direct?.items)) return direct.items;
  if (direct && typeof direct === "object") {
    const single = direct.instructor ?? direct.user ?? direct;
    if (single && typeof single === "object") return [single as Instructor];
  }
  return [];
}

// --- Component ---

export default function CoursesPage() {
  const { isRTL, language } = useLanguage();
  const currentLocale = language as "en" | "ar";
  const router = useRouter();
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "logistics">("basic");
  
  // Form State
  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Assign Instructor State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignCourse, setAssignCourse] = useState<Course | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [instructorSearchQuery, setInstructorSearchQuery] = useState("");
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);

  const apiBaseUrl = getAdminApiBaseUrl();

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
      const [coursesRes, catsRes] = await Promise.all([
        axios.get(getAdminApiRequestUrl("/super-admin/courses/all"), { headers: getHeaders(currentLocale) }),
        axios.get(getAdminApiRequestUrl(CATEGORIES_API_PATH), { headers: getHeaders(currentLocale) }),
      ]);

      // Extracting data based on common Laravel API patterns seen in previous files
      const extractData = (res: any) => res.data?.data?.data || res.data?.data || res.data || [];
      
      setCourses(Array.isArray(extractData(coursesRes)) ? extractData(coursesRes) : []);
      setCategories(Array.isArray(extractData(catsRes)) ? extractData(catsRes) : []);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to load courses."));
    } finally {
      setIsLoading(false);
    }
  }, [currentLocale, getHeaders]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter(c => 
      getLocalizedValue(c.title, "en").toLowerCase().includes(query) ||
      getLocalizedValue(c.title, "ar").toLowerCase().includes(query)
    );
  }, [courses, searchQuery]);

  const openCreateModal = () => {
    setForm(initialForm);
    setModalMode("create");
    setFieldErrors({});
    setActiveTab("basic");
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    
    const titlePair = getLocalizedInputPair(course.title, course.title_translations, currentLocale);
    const descPair = getLocalizedInputPair(course.description, course.description_translations, currentLocale);
    const objPair = getLocalizedInputPair(course.objectives, course.objectives_translations, currentLocale);
    const prePair = getLocalizedInputPair(course.prerequisites, course.prerequisites_translations, currentLocale);
    const categoryId = course.course_category_id || course.category?.id || "";

    setForm({
      course_category_id: String(categoryId),
      title_en: titlePair.en,
      title_ar: titlePair.ar,
      description_en: descPair.en,
      description_ar: descPair.ar,
      objectives_en: objPair.en,
      objectives_ar: objPair.ar,
      prerequisites_en: prePair.en,
      prerequisites_ar: prePair.ar,
      actual_duration_hours: String(course.actual_duration_hours),
      language: course.language,
      status: course.status,
      min_score_to_pass: String(course.min_score_to_pass),
      is_offline_available: course.is_offline_available,
      course_delivery_type: course.course_delivery_type,
      difficulty_level: course.difficulty_level,
    });
    setModalMode("edit");
    setFieldErrors({});
    setActiveTab("basic");
    setIsModalOpen(true);
  };

  const updateField = (field: keyof FormState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    
    try {
      const resolvedCategoryId = Number(form.course_category_id || editingCourse?.course_category_id || editingCourse?.category?.id || 0);
      if (!resolvedCategoryId) {
        setFieldErrors(prev => ({ ...prev, course_category_id: "Category is required." }));
        setActiveTab("basic");
        return;
      }

      const payload = {
        course_category_id: resolvedCategoryId,
        title: { en: form.title_en, ar: form.title_ar },
        description: { en: form.description_en, ar: form.description_ar },
        objectives: { en: form.objectives_en, ar: form.objectives_ar },
        prerequisites: { en: form.prerequisites_en, ar: form.prerequisites_ar },
        actual_duration_hours: Number(form.actual_duration_hours),
        language: form.language,
        status: form.status,
        min_score_to_pass: Number(form.min_score_to_pass),
        is_offline_available: form.is_offline_available,
        course_delivery_type: form.course_delivery_type,
        difficulty_level: form.difficulty_level,
      };

      if (modalMode === "create") {
        await axios.post(getAdminApiRequestUrl(API_PATH), payload, { headers: getHeaders(currentLocale) });
        setSuccessMessage("Course created successfully!");
      } else if (editingCourse) {
        await axios.put(getAdminApiRequestUrl(`${API_PATH}/${editingCourse.id}`), payload, { headers: getHeaders(currentLocale) });
        setSuccessMessage("Course updated successfully!");
      }

      setIsModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const newFieldErrors: FieldErrors = {};
        Object.keys(errors).forEach(key => {
          // Map backend nested keys like title.en to title_en
          const mappedKey = key.replace(".", "_") as FieldName;
          newFieldErrors[mappedKey] = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
        });
        setFieldErrors(newFieldErrors);
        
        // Switch tab if error is in another tab
        if (Object.keys(newFieldErrors).some(k => k.includes("title") || k.includes("category") || k.includes("language"))) {
          setActiveTab("basic");
        } else if (Object.keys(newFieldErrors).some(k => k.includes("description") || k.includes("objectives") || k.includes("prerequisites"))) {
          setActiveTab("content");
        } else {
          setActiveTab("logistics");
        }
      } else {
        setListError(getErrorMessage(error, "Operation failed."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "review": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "archived": return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
      case "draft": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default: return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    }
  };

  // --- Assign Instructor ---
  const openAssignModal = async (course: Course) => {
    setAssignCourse(course);
    setSelectedInstructorId("");
    setInstructorSearchQuery("");
    setIsAssignModalOpen(true);
    setIsLoadingInstructors(true);
    try {
      const res = await axios.get(
        getAdminApiRequestUrl(`${API_PATH}/${course.id}/instructors`),
        { headers: getHeaders(currentLocale) }
      );
      const data = extractInstructorsFromPayload(res);
      setInstructors(Array.isArray(data) ? data : []);
    } catch {
      setInstructors([]);
    } finally {
      setIsLoadingInstructors(false);
    }
  };

  const getInstructorDisplayName = (inst: Instructor) => {
    if (inst.name) return inst.name;
    if (inst.first_name || inst.last_name) return `${inst.first_name || ""} ${inst.last_name || ""}`.trim();
    return inst.email || `Instructor #${getInstructorIdValue(inst)}`;
  };

  const filteredInstructors = useMemo(() => {
    const q = instructorSearchQuery.trim().toLowerCase();
    if (!q) return instructors;
    return instructors.filter(inst => {
      const name = getInstructorDisplayName(inst).toLowerCase();
      const email = (inst.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [instructors, instructorSearchQuery]);

  const handleAssignInstructor = async () => {
    if (!assignCourse || !selectedInstructorId) return;
    setIsAssigning(true);
    try {
      await axios.post(
        getAdminApiRequestUrl(`${API_PATH}/${assignCourse.id}/instructors/assign`),
        { instructor_id: Number(selectedInstructorId) },
        { headers: getHeaders(currentLocale) }
      );
      setSuccessMessage("Instructor assigned successfully!");
      setIsAssignModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to assign instructor."));
      setIsAssignModalOpen(false);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className={`p-6 md:p-10 min-h-screen bg-slate-50 dark:bg-transparent transition-colors duration-500 ${isRTL ? "text-right" : ""}`}>
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-[1600px] mx-auto relative z-10">
        {/* Header */}
        <header className={`flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16 ${isRTL ? "lg:flex-row-reverse text-right" : ""}`}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className={`flex items-center gap-2 text-indigo-500 font-black uppercase tracking-[0.3em] text-[10px] mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Layout className="w-3 h-3" />
              Learning Management
            </div>
            <h1 className="text-4xl md:text-5xl 2xl:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
              Course <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 to-purple-500">Inventory</span>
            </h1>
            <p className="mt-4 text-slate-500 dark:text-white/40 font-bold text-sm md:text-base max-w-2xl">
              Architecture and oversight of the platform's educational curriculum and content delivery systems.
            </p>
          </motion.div>

          <div className={`flex flex-wrap items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button 
              onClick={() => void loadData()}
              className="p-4 md:p-5 rounded-2xl md:rounded-[24px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90"
            >
              <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={openCreateModal}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 md:py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl md:rounded-[24px] font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-1 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Add New Course
            </button>
          </div>
        </header>

        {/* Notifications */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3"
            >
              <BadgeCheck className="w-5 h-5" />
              <span className="font-bold">{successMessage}</span>
            </motion.div>
          )}
          {listError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold">{listError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <div className="mb-12 relative group">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5 md:w-6 md:h-6 ${isRTL ? "right-6 md:right-8" : "left-6 md:left-8"}`} />
          <input 
            type="text"
            placeholder="Search courses by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-5 md:py-7 rounded-3xl md:rounded-[40px] bg-white dark:bg-white/3 border border-slate-200 dark:border-white/5 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all text-slate-900 dark:text-white font-bold text-base md:text-lg ${isRTL ? "pr-16 md:pr-20 pl-6 text-right" : "pl-16 md:pl-20 pr-6"}`}
          />
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 4k:grid-cols-6 gap-6 md:gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[400px] rounded-[48px] bg-white dark:bg-white/3 animate-pulse border border-slate-200 dark:border-white/5" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-32 bg-white dark:bg-white/3 rounded-[64px] border border-dashed border-slate-200 dark:border-white/10 shadow-inner">
            <Layout className="w-20 h-20 text-slate-300 dark:text-white/10 mx-auto mb-6" />
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3">No courses found</h3>
            <p className="text-slate-500 dark:text-white/40 max-w-md mx-auto font-medium">We couldn't find any results matching your search. Try different keywords or expand the curriculum.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 4k:grid-cols-6 gap-8 md:gap-10">
            {filteredCourses.map((course, idx) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="group relative flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5"
              >
                {/* Image / Banner Area */}
                <div className="relative h-40 w-full overflow-hidden shrink-0 bg-slate-50 dark:bg-white/[0.02]">
                  {course.cover_url ? (
                    <img src={course.cover_url} alt={getLocalizedValue(course.title, currentLocale)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50/50 dark:bg-indigo-500/5">
                      <BookOpen className="w-12 h-12 text-indigo-200 dark:text-indigo-500/20" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"} px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm
                    ${course.status === 'published' ? 'bg-emerald-100/90 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 
                      course.status === 'draft' ? 'bg-amber-100/90 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 
                      'bg-slate-100/90 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'}`}
                  >
                    {course.status}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 flex flex-col grow">
                  <h3 className={`text-lg font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isRTL ? "text-right" : ""}`}>
                    {getLocalizedValue(course.title, currentLocale)}
                  </h3>
                  
                  <p className={`text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-5 leading-relaxed min-h-[2.75rem] ${isRTL ? "text-right" : ""}`}>
                    {getLocalizedValue(course.description, currentLocale) || "No description provided for this course."}
                  </p>

                  <div className={`flex flex-wrap gap-2 mb-6 mt-auto ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/5">
                      <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        {course.difficulty_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/5">
                      <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        {course.actual_duration_hours}h
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 dark:border-white/10 ${isRTL ? "text-right" : ""}`}>
                    <button 
                      type="button"
                      onClick={() => openEditModal(course)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3 py-2.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#151722]"
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" />
                      Manage
                    </button>
                    <button 
                      type="button"
                      onClick={() => openAssignModal(course)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[12px] font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#151722]"
                    >
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      Assign
                    </button>
                    <button 
                      type="button"
                      onClick={() => router.push(`/admin/courses/${course.id}/units`)}
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600 px-3 py-2.5 text-[12px] font-bold text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#151722]"
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      Units
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
}
      </div>

      {/* Modal */}
      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl 2xl:max-w-7xl bg-white dark:bg-[#0A0F1D] md:rounded-[64px] overflow-hidden shadow-[0_100px_150px_-30px_rgba(0,0,0,0.5)] border-t md:border border-slate-200 dark:border-white/10"
            >
              <div className="flex flex-col h-full md:max-h-[90vh]">
                {/* Modal Header */}
                <header className={`p-8 md:p-12 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/2 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <div className={`flex items-center gap-2 text-indigo-500 font-black uppercase tracking-[0.3em] text-[10px] mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Settings className="w-3 h-3" />
                      Course Configurator
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      {modalMode === "create" ? "Launch Course" : "Update Core"}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-4 rounded-3xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-500 transition-all active:scale-90"
                  >
                    <X className="w-7 h-7 md:w-8 md:h-8" />
                  </button>
                </header>

                {/* Tabs */}
                <nav className={`flex p-2 md:p-3 bg-slate-100 dark:bg-white/5 mx-8 md:mx-12 mt-8 md:mt-10 mb-0 rounded-[32px] md:rounded-[40px] shadow-inner ${isRTL ? "flex-row-reverse" : ""}`}>
                  {[
                    { id: "basic", label: "Identity", icon: Layout },
                    { id: "content", label: "Experience", icon: BookOpen },
                    { id: "logistics", label: "Dynamics", icon: Target },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-3 py-4 md:py-6 rounded-3xl md:rounded-[36px] font-black uppercase tracking-widest text-[10px] md:text-[11px] transition-all relative ${
                        activeTab === tab.id 
                        ? "text-indigo-600 dark:text-white" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-white/60"
                      }`}
                    >
                      {activeTab === tab.id && (
                        <motion.div 
                          layoutId="modalTabLarge" 
                          className="absolute inset-0 bg-white dark:bg-indigo-600 rounded-3xl md:rounded-[36px] shadow-2xl shadow-indigo-500/20" 
                        />
                      )}
                      <span className="relative z-10 flex flex-col md:flex-row items-center gap-2">
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </span>
                    </button>
                  ))}
                </nav>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                  {activeTab === "basic" && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Title EN */}
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            Launch Title (English)
                          </label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 ${fieldErrors.title_en ? "border-rose-500/50" : "border-transparent focus-within:border-indigo-500/30"} transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Layout className="w-6 h-6 text-indigo-500" />
                            <input 
                              type="text" 
                              placeholder="e.g. Masterclass in UX"
                              value={form.title_en}
                              onChange={(e) => updateField("title_en", e.target.value)}
                              className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-lg md:text-xl placeholder:text-slate-400 dark:placeholder:text-white/10 ${isRTL ? "text-right" : ""}`}
                            />
                          </div>
                          {fieldErrors.title_en && <p className="text-xs font-bold text-rose-500 pl-2">{fieldErrors.title_en}</p>}
                        </div>

                        {/* Title AR */}
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            عنوان الدورة (العربية)
                          </label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 ${fieldErrors.title_ar ? "border-rose-500/50" : "border-transparent focus-within:border-indigo-500/30"} transition-all flex-row-reverse`}>
                            <Languages className="w-6 h-6 text-indigo-500" />
                            <input 
                              type="text" 
                              dir="rtl"
                              placeholder="مثال: التصميم المتقدم"
                              value={form.title_ar}
                              onChange={(e) => updateField("title_ar", e.target.value)}
                              className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-lg md:text-xl placeholder:text-slate-400 dark:placeholder:text-white/10 text-right"
                            />
                          </div>
                          {fieldErrors.title_ar && <p className="text-xs font-bold text-rose-500 pr-2 text-right">{fieldErrors.title_ar}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                        {/* Category */}
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            Cluster Category
                          </label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Layers className="w-6 h-6 text-indigo-500" />
                            <select 
                              value={form.course_category_id}
                              onChange={(e) => updateField("course_category_id", e.target.value)}
                              className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black appearance-none cursor-pointer ${isRTL ? "text-right" : ""}`}
                            >
                              <option value="" className="dark:bg-[#0A0F1D]">Select Path</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id} className="dark:bg-[#0A0F1D]">
                                  {typeof cat.name === 'string' ? cat.name : getLocalizedValue(cat.name, currentLocale)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Language */}
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            Instruction Language
                          </label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Globe className="w-6 h-6 text-indigo-500" />
                            <select 
                              value={form.language}
                              onChange={(e) => updateField("language", e.target.value)}
                              className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black appearance-none cursor-pointer ${isRTL ? "text-right" : ""}`}
                            >
                              <option value="en" className="dark:bg-[#0A0F1D]">English Universal</option>
                              <option value="ar" className="dark:bg-[#0A0F1D]">Arabic Original</option>
                            </select>
                          </div>
                        </div>

                        {/* Difficulty */}
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            Complexity Tier
                          </label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <GraduationCap className="w-6 h-6 text-indigo-500" />
                            <select 
                              value={form.difficulty_level}
                              onChange={(e) => updateField("difficulty_level", e.target.value)}
                              className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black appearance-none cursor-pointer ${isRTL ? "text-right" : ""}`}
                            >
                              <option value="beginner" className="dark:bg-[#0A0F1D]">Foundational (Entry)</option>
                              <option value="intermediate" className="dark:bg-[#0A0F1D]">Specialized (Mid)</option>
                              <option value="advanced" className="dark:bg-[#0A0F1D]">Mastery (Expert)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "content" && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            Vision Narrative (English)
                          </label>
                          <textarea 
                            rows={8}
                            value={form.description_en}
                            onChange={(e) => updateField("description_en", e.target.value)}
                            placeholder="Craft the story of this course..."
                            className={`w-full p-8 rounded-[40px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/30 outline-none text-slate-900 dark:text-white font-bold leading-relaxed transition-all resize-none ${isRTL ? "text-right" : ""}`}
                          />
                        </div>
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            وصف المسار (بالعربية)
                          </label>
                          <textarea 
                            rows={8}
                            dir="rtl"
                            value={form.description_ar}
                            onChange={(e) => updateField("description_ar", e.target.value)}
                            placeholder="ارسم رحلة المتعلم بالكلمات..."
                            className="w-full p-8 rounded-[40px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/30 outline-none text-slate-900 dark:text-white font-bold leading-relaxed transition-all resize-none text-right"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            Strategic Objectives (English)
                          </label>
                          <textarea 
                            rows={5}
                            value={form.objectives_en}
                            onChange={(e) => updateField("objectives_en", e.target.value)}
                            className={`w-full p-8 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/30 outline-none text-slate-900 dark:text-white font-bold leading-relaxed transition-all resize-none ${isRTL ? "text-right" : ""}`}
                          />
                        </div>
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                            Gatekeeper Prerequisites (English)
                          </label>
                          <textarea 
                            rows={5}
                            value={form.prerequisites_en}
                            onChange={(e) => updateField("prerequisites_en", e.target.value)}
                            className={`w-full p-8 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/30 outline-none text-slate-900 dark:text-white font-bold leading-relaxed transition-all resize-none ${isRTL ? "text-right" : ""}`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "logistics" && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Temporal Duration (Hours)</label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Clock className="w-6 h-6 text-indigo-500" />
                            <input 
                              type="number" 
                              value={form.actual_duration_hours}
                              onChange={(e) => updateField("actual_duration_hours", e.target.value)}
                              className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-xl ${isRTL ? "text-right" : ""}`}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Delivery Logic</label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <MonitorPlay className="w-6 h-6 text-indigo-500" />
                            <select 
                              value={form.course_delivery_type}
                              onChange={(e) => updateField("course_delivery_type", e.target.value)}
                              className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black appearance-none cursor-pointer ${isRTL ? "text-right" : ""}`}
                            >
                              <option value="self_paced" className="dark:bg-[#0A0F1D]">Autonomous (Self-Paced)</option>
                              <option value="interactive" className="dark:bg-[#0A0F1D]">Connected (Interactive)</option>
                              <option value="hybrid" className="dark:bg-[#0A0F1D]">Integrated (Hybrid)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Pass Benchmark (%)</label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Trophy className="w-6 h-6 text-indigo-500" />
                            <input 
                              type="number" 
                              value={form.min_score_to_pass}
                              onChange={(e) => updateField("min_score_to_pass", e.target.value)}
                              className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-xl ${isRTL ? "text-right" : ""}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Deployment Status</label>
                          <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Settings className="w-6 h-6 text-indigo-500" />
                            <select 
                              value={form.status}
                              onChange={(e) => updateField("status", e.target.value)}
                              className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black appearance-none cursor-pointer ${isRTL ? "text-right" : ""}`}
                            >
                              <option value="published" className="dark:bg-[#0A0F1D]">Live (Published)</option>
                              <option value="review" className="dark:bg-[#0A0F1D]">Review (QA)</option>
                              <option value="archived" className="dark:bg-[#0A0F1D]">Storage (Archived)</option>
                              <option value="draft" className="dark:bg-[#0A0F1D]">Concept (Draft)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Connectivity Governance</label>
                          <label className={`flex items-center justify-between p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                            <div className={`flex items-center gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>
                              <div className={`p-4 rounded-2xl ${form.is_offline_available ? "bg-indigo-500 text-white shadow-xl shadow-indigo-500/30" : "bg-slate-200 dark:bg-white/10 text-slate-400"} transition-all duration-500`}>
                                <ShieldCheck className="w-6 h-6" />
                              </div>
                              <div>
                                <span className="block font-black text-slate-900 dark:text-white">Offline Vaulting</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allow local access</span>
                              </div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={form.is_offline_available}
                              onChange={(e) => updateField("is_offline_available", e.target.checked)}
                              className="w-8 h-8 rounded-xl accent-indigo-600 cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </form>

                {/* Modal Footer */}
                <footer className={`p-8 md:p-12 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-4 bg-slate-50/50 dark:bg-white/2 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-10 py-5 rounded-[24px] md:rounded-[32px] border-2 border-slate-200 dark:border-white/10 font-black uppercase tracking-widest text-[10px] md:text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  >
                    Abort Changes
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] md:rounded-[32px] font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-2xl shadow-indigo-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    {modalMode === "create" ? "Initialize & Deploy" : "Commit System Update"}
                  </button>
                </footer>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
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
