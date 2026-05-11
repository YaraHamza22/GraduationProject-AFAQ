"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Edit3,
  GraduationCap,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { extractAdminMessage, getAdminToken } from "@/features/admin/adminSession";

type StudentProfile = Record<string, unknown> & {
  education_level?: string | null;
  country?: string | null;
  bio?: string | null;
  specialization?: string | null;
  joined_at?: string | null;
};

type Student = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  email?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  updated_at?: string | null;
  student_profile?: StudentProfile | null;
};

type DetailMode = "profile" | "courses" | "quizzes";
type Mode = "create" | "edit";

type FormState = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  education_level: string;
  country: string;
  bio: string;
  specialization: string;
  joined_at: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const ROOT = "/super-admin/students";

const initialForm: FormState = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  address: "",
  education_level: "",
  country: "",
  bio: "",
  specialization: "",
  joined_at: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return "";
}

function studentId(student: Student | null) {
  if (!student) return null;
  const id = student.id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

function asDateInput(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function asDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function parseStudentList(payload: unknown): Student[] {
  if (Array.isArray(payload)) return payload.filter(isRecord) as Student[];
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data.filter(isRecord) as Student[];
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data.filter(isRecord) as Student[];
  return [];
}

function parseSingleStudent(payload: unknown): Student | null {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data as Student;
  if (isRecord(payload)) return payload as Student;
  return null;
}

function parsePaginationPages(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.pagination)) return 1;
  const raw = payload.pagination.total_pages ?? payload.pagination.last_page;
  const pages = Number(raw);
  return Number.isFinite(pages) && pages > 1 ? pages : 1;
}

function parseFormErrors(error: unknown): FieldErrors {
  if (!axios.isAxiosError(error) || !isRecord(error.response?.data?.errors)) return {};
  const source = error.response.data.errors;
  const mapped: FieldErrors = {};

  for (const [key, value] of Object.entries(source)) {
    const normalized = key.replace(/^student_profile\./, "");
    if (!(normalized in initialForm)) continue;
    const first = Array.isArray(value) ? value.find((item) => typeof item === "string" && item.trim()) : value;
    if (typeof first === "string" && first.trim()) mapped[normalized as keyof FormState] = first;
  }

  return mapped;
}

function errorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
  }

  if (!error.response) return "Cannot reach backend API.";
  const message = error.response.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function getArrayFromRelatedPayload(payload: unknown, key: "courses" | "quizzes") {
  if (!isRecord(payload)) return [];
  const root = isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(root)) return [];
  const direct = root[key];
  if (Array.isArray(direct)) return direct;
  if (isRecord(root.data) && Array.isArray(root.data[key])) return root.data[key] as unknown[];
  return [];
}

function getStudentFromRelatedPayload(payload: unknown) {
  if (!isRecord(payload)) return null;
  const root = isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(root)) return null;
  return isRecord(root.student) ? (root.student as Student) : null;
}

function itemTitle(item: unknown, index: number, fallback: string) {
  if (!isRecord(item)) return `${fallback} #${index + 1}`;
  return (
    toText(item.title) ||
    toText(item.name) ||
    toText(item.quiz_title) ||
    toText(item.course_title) ||
    `${fallback} #${index + 1}`
  );
}

function itemDescription(item: unknown) {
  if (!isRecord(item)) return "";
  if (toText(item.description)) return toText(item.description);
  if (isRecord(item.description_translations)) {
    return toText(item.description_translations.en) || toText(item.description_translations.ar);
  }
  return "";
}

function itemMeta(item: unknown) {
  if (!isRecord(item)) return [];
  const rows: Array<{ label: string; value: string }> = [];
  const pairs: Array<[string, unknown]> = [
    ["ID", item.id],
    ["Slug", item.slug],
    ["Status", item.status],
    ["Type", item.type],
    ["Level", item.level],
  ];
  pairs.forEach(([label, value]) => {
    const v = toText(value);
    if (v) rows.push({ label, value: v });
  });
  return rows;
}

function buildFormFromStudent(student: Student): FormState {
  const profile = isRecord(student.student_profile) ? (student.student_profile as StudentProfile) : null;
  return {
    name: toText(student.name),
    email: toText(student.email),
    password: "",
    password_confirmation: "",
    phone: toText(student.phone),
    date_of_birth: asDateInput(student.date_of_birth),
    gender: toText(student.gender),
    address: toText(student.address),
    education_level: toText(profile?.education_level),
    country: toText(profile?.country),
    bio: toText(profile?.bio),
    specialization: toText(profile?.specialization),
    joined_at: asDateInput(profile?.joined_at),
  };
}

export default function StudentsManagement() {
  const { isRTL } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("create");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [modalOpen, setModalOpen] = useState(false);

  const [detailMode, setDetailMode] = useState<DetailMode>("profile");
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [detailItems, setDetailItems] = useState<unknown[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const headers = useCallback(() => {
    const token = getAdminToken();
    if (!token) throw new Error("Admin token missing.");
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const loadStudents = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);
      try {
        const reqHeaders = headers();
        const first = await axios.get(getAdminApiRequestUrl(ROOT), { headers: reqHeaders });
        const all = [...parseStudentList(first.data)];
        const pages = parsePaginationPages(first.data);

        for (let page = 2; page <= pages; page += 1) {
          const response = await axios.get(getAdminApiRequestUrl(ROOT), { headers: reqHeaders, params: { page } });
          all.push(...parseStudentList(response.data));
        }

        setStudents(all);
      } catch (ex) {
        setStudents([]);
        setError(errorMessage(ex, "Failed to load students."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [headers],
  );

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => [student.name, student.email, student.phone, student.address].some((value) => toText(value).toLowerCase().includes(q)));
  }, [students, query]);

  const updateField =
    (key: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      setFormErrors((current) => ({ ...current, [key]: undefined }));
      setError(null);
    };

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    const id = studentId(student);
    if (id === null) return;
    setMode("edit");
    setEditingId(id);
    setForm(buildFormFromStudent(student));
    setFormErrors({});
    setError(null);
    setModalOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    setFormErrors({});

    try {
      if (!form.name.trim() || !form.email.trim()) throw new Error("Name and email are required.");
      if (mode === "create" && (!form.password || !form.password_confirmation)) throw new Error("Password and confirmation are required.");
      if ((form.password || form.password_confirmation) && form.password !== form.password_confirmation) throw new Error("Password and confirmation must match.");

      if (mode === "create") {
        const response = await axios.post(
          getAdminApiRequestUrl(ROOT),
          {
            ...form,
            phone: form.phone || null,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            address: form.address || null,
            education_level: form.education_level || null,
            country: form.country || null,
            bio: form.bio || null,
            specialization: form.specialization || null,
            joined_at: form.joined_at || null,
          },
          { headers: headers() },
        );
        setMessage(extractAdminMessage(response.data) ?? "Student created successfully.");
      } else {
        if (editingId === null) throw new Error("Missing student id.");
        const payload: Record<string, unknown> = {};
        (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
          if (form[key]) payload[key] = form[key];
        });
        if (!Object.keys(payload).length) throw new Error("Add at least one field to update.");

        const response = await axios.put(getAdminApiRequestUrl(`${ROOT}/${editingId}`), payload, { headers: headers() });
        setMessage(extractAdminMessage(response.data) ?? "Student updated successfully.");
      }

      setModalOpen(false);
      await loadStudents(true);
    } catch (ex) {
      setError(errorMessage(ex, mode === "create" ? "Failed to create student." : "Failed to update student."));
      setFormErrors(parseFormErrors(ex));
    } finally {
      setBusy(false);
    }
  };

  const removeStudent = async (student: Student) => {
    const id = studentId(student);
    if (id === null) return;
    if (!window.confirm(`Delete "${toText(student.name) || `#${id}`}"?`)) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await axios.delete(getAdminApiRequestUrl(`${ROOT}/${id}`), { headers: headers() });
      setMessage(extractAdminMessage(response.data) ?? "Student deleted successfully.");
      await loadStudents(true);
    } catch (ex) {
      setError(errorMessage(ex, "Failed to delete student."));
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (student: Student, nextMode: DetailMode) => {
    const id = studentId(student);
    if (id === null) return;

    setDetailOpen(true);
    setDetailMode(nextMode);
    setDetailLoading(true);
    setDetailStudent(null);
    setDetailItems([]);
    setError(null);

    try {
      if (nextMode === "profile") {
        const response = await axios.get(getAdminApiRequestUrl(`${ROOT}/${id}`), { headers: headers() });
        setDetailStudent(parseSingleStudent(response.data));
      } else {
        const response = await axios.get(getAdminApiRequestUrl(`${ROOT}/${id}/with-${nextMode}`), { headers: headers() });
        setDetailStudent(getStudentFromRelatedPayload(response.data));
        setDetailItems(getArrayFromRelatedPayload(response.data, nextMode));
      }
    } catch (ex) {
      setError(errorMessage(ex, `Failed to load ${nextMode}.`));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_78%_-8%,#dbeafe_0%,#f8fafc_42%,#eef2ff_100%)] p-6 dark:bg-[radial-gradient(circle_at_78%_-8%,#172554_0%,#020617_42%,#0f172a_100%)]">
      <div className="mx-auto max-w-[1650px] space-y-5 text-slate-900 dark:text-slate-100">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-200">
              <GraduationCap className="h-3.5 w-3.5" />
              Student Registry
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white">Students Workspace</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">All IDs are automatic from selected rows.</p>
          </div>
          <div className={`flex flex-wrap items-center gap-2 ${isRTL ? "justify-end" : ""}`}>
            <div className="group relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 dark:text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students..."
                className="h-10 w-72 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none ring-indigo-500/20 transition focus:ring-4 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <button
              onClick={() => void loadStudents(true)}
              disabled={loading || busy || refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Add Student
            </button>
          </div>
        </section>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}
        {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</p> : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700 dark:text-slate-300">
            {loading ? "Loading..." : `${filteredStudents.length} students`}
          </div>
          <div className="overflow-x-auto">
            <table className={`min-w-full ${isRTL ? "text-right" : "text-left"}`}>
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-900/90 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className={`px-4 py-3 ${isRTL ? "text-left" : "text-right"}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => {
                  const id = studentId(student);
                  const profile = isRecord(student.student_profile) ? student.student_profile : null;
                  return (
                    <motion.tr
                      key={String(id ?? index)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-t border-slate-100 transition hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:bg-indigo-500/10"
                    >
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-900 dark:text-slate-100">{toText(student.name) || "Unnamed"}</p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">ID #{id ?? "n/a"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{toText(student.email) || "No email"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{toText(student.phone) || "No phone"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        <p>{toText(profile?.education_level) || "No level"}</p>
                        <p className="text-xs">{toText(profile?.country) || "No country"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex flex-wrap gap-1 ${isRTL ? "justify-start" : "justify-end"}`}>
                          <button onClick={() => void openDetail(student, "profile")} className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-black uppercase text-slate-700 dark:border-slate-600 dark:text-slate-200">Show</button>
                          <button onClick={() => void openDetail(student, "courses")} className="inline-flex items-center gap-1 rounded-md bg-cyan-600 px-2 py-1 text-[10px] font-black uppercase text-white"><BookOpen className="h-3 w-3" />Courses</button>
                          <button onClick={() => void openDetail(student, "quizzes")} className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-[10px] font-black uppercase text-white"><HelpCircle className="h-3 w-3" />Quizzes</button>
                          <button onClick={() => openEdit(student)} className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-[10px] font-black uppercase text-white"><Edit3 className="h-3 w-3" />Edit</button>
                          <button onClick={() => void removeStudent(student)} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-[10px] font-black uppercase text-white"><Trash2 className="h-3 w-3" />Delete</button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {modalOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/60 p-6">
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{mode === "create" ? "Create Student" : "Update Student"}</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={(e) => void submit(e)} className="grid gap-3 p-5 md:grid-cols-2">
                {(["name", "email", "password", "password_confirmation", "phone", "date_of_birth", "address", "country", "specialization", "joined_at"] as (keyof FormState)[]).map((key) => (
                  <div key={key}>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{key}</label>
                    <input
                      type={key.includes("password") ? "password" : key.includes("date") || key === "joined_at" ? "date" : "text"}
                      value={form[key]}
                      onChange={updateField(key)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none ring-indigo-500/20 focus:ring-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    {formErrors[key] ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{formErrors[key]}</p> : null}
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">gender</label>
                  <select value={form.gender} onChange={updateField("gender")} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <option value="">Select</option>
                    <option value="female">female</option>
                    <option value="male">male</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">education_level</label>
                  <select value={form.education_level} onChange={updateField("education_level")} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <option value="">Select</option>
                    <option value="highschool">highschool</option>
                    <option value="collage">collage</option>
                    <option value="master">master</option>
                    <option value="doctorate">doctorate</option>
                    <option value="other">other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">bio</label>
                  <textarea value={form.bio} onChange={updateField("bio")} rows={4} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div className={`md:col-span-2 flex gap-2 ${isRTL ? "justify-start" : "justify-end"}`}>
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-black uppercase text-slate-700 dark:border-slate-600 dark:text-slate-200">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {mode === "create" ? "Create" : "Update"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detailOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-950/40">
            <div className={`h-full w-full max-w-lg border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${isRTL ? "mr-auto border-r" : "ml-auto border-l"}`}>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">{detailMode}</p>
                <button onClick={() => setDetailOpen(false)} className="text-slate-600 dark:text-slate-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-4">
                {detailLoading ? <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading...</p> : null}

                {detailMode === "profile" && detailStudent ? (
                  <div className="space-y-2">
                    {[
                      ["Name", toText(detailStudent.name)],
                      ["Email", toText(detailStudent.email)],
                      ["Phone", toText(detailStudent.phone)],
                      ["Updated", asDateTime(detailStudent.updated_at)],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{value || "Not set"}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {detailMode !== "profile" ? (
                  <div className="space-y-3">
                    {!detailLoading && detailItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">No items found.</p>
                    ) : null}
                    {detailItems.map((item, index) => {
                      const meta = itemMeta(item);
                      return (
                        <article key={`${detailMode}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{itemTitle(item, index, detailMode === "courses" ? "Course" : "Quiz")}</h4>
                          {itemDescription(item) ? <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{itemDescription(item)}</p> : null}
                          {meta.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {meta.map((entry) => (
                                <span key={`${entry.label}-${entry.value}`} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                  {entry.label}: {entry.value}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
