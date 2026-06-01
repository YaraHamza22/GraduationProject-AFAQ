"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { extractAdminMessage, getAdminToken } from "@/features/admin/adminSession";

type AuditorProfile = Record<string, unknown> & {
  specialization?: string | null;
  bio?: string | null;
  years_of_experience?: string | number | null;
};

type Auditor = Record<string, unknown> & {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  auditor_profile?: AuditorProfile | null;
};

type Mode = "create" | "edit";
type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type PasswordToggleField = {
  key: "password" | "password_confirmation";
  label: string;
  placeholder: string;
  visible: boolean;
  toggle: React.Dispatch<React.SetStateAction<boolean>>;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  bio: string;
  specialization: string;
  years_of_experience: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const ROOT = "/super-admin/auditors";
const PAGE_SIZE = 20;

const initialForm: FormState = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  address: "",
  bio: "",
  specialization: "auditor",
  years_of_experience: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return "";
}

function parseDateInput(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function auditorId(auditor: Auditor | null) {
  if (!auditor) return null;
  const id = auditor.id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

function parseAuditorList(payload: unknown): Auditor[] {
  if (Array.isArray(payload)) return payload.filter(isRecord) as Auditor[];
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data.filter(isRecord) as Auditor[];
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data.filter(isRecord) as Auditor[];
  return [];
}

function parseSingleAuditor(payload: unknown): Auditor | null {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data as Auditor;
  if (isRecord(payload)) return payload as Auditor;
  return null;
}

function parseTotalPages(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.pagination)) return 1;
  const raw = payload.pagination.total_pages ?? payload.pagination.last_page;
  const total = Number(raw);
  return Number.isFinite(total) && total > 0 ? total : 1;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return "Cannot reach backend API.";
  const message = extractAdminMessage(error.response.data);
  return typeof message === "string" && message.trim() ? message : fallback;
}

function parseFormErrors(error: unknown): FieldErrors {
  if (!axios.isAxiosError(error) || !isRecord(error.response?.data?.errors)) return {};
  const source = error.response.data.errors;
  const next: FieldErrors = {};

  for (const [key, value] of Object.entries(source)) {
    const normalized = key.replace(/^auditor_profile\./, "") as keyof FormState;
    if (!(normalized in initialForm)) continue;
    const message = Array.isArray(value) ? value.find((item) => typeof item === "string" && item.trim()) : value;
    if (typeof message === "string" && message.trim()) {
      next[normalized] = message;
    }
  }

  return next;
}

function buildForm(auditor: Auditor): FormState {
  const profile = isRecord(auditor.auditor_profile) ? (auditor.auditor_profile as AuditorProfile) : null;
  return {
    name: toText(auditor.name),
    email: toText(auditor.email),
    password: "",
    password_confirmation: "",
    phone: toText(auditor.phone),
    date_of_birth: parseDateInput(auditor.date_of_birth),
    gender: toText(auditor.gender),
    address: toText(auditor.address),
    bio: toText(profile?.bio),
    specialization: "auditor",
    years_of_experience: toText(profile?.years_of_experience),
  };
}

export default function AuditorPage() {
  const { isRTL, t } = useLanguage();
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<Auditor | null>(null);
  const [mode, setMode] = useState<Mode>("create");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const pushToast = useCallback((message: string, tone: ToastTone) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const headers = useCallback(() => {
    const token = getAdminToken();
    if (!token) throw new Error("Admin token missing. Please sign in again.");
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const loadAuditors = useCallback(
    async (nextPage = page, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await axios.get(getAdminApiRequestUrl(ROOT), {
          headers: headers(),
          params: { page: nextPage, per_page: PAGE_SIZE },
        });
        setAuditors(parseAuditorList(response.data));
        setTotalPages(parseTotalPages(response.data));
        setPage(nextPage);
      } catch (error) {
        pushToast(getErrorMessage(error, "Unable to load auditors."), "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [headers, page, pushToast]
  );

  useEffect(() => {
    void loadAuditors(1);
  }, [loadAuditors]);

  const filteredAuditors = useMemo(() => {
    const token = query.trim().toLowerCase();
    if (!token) return auditors;
    return auditors.filter((auditor) => {
      const profile = isRecord(auditor.auditor_profile) ? auditor.auditor_profile : null;
      return [
        toText(auditor.name),
        toText(auditor.email),
        toText(auditor.phone),
        toText(auditor.gender),
        toText(auditor.address),
        toText(profile?.specialization),
      ]
        .join(" ")
        .toLowerCase()
        .includes(token);
    });
  }, [auditors, query]);

  const openCreateModal = () => {
    setMode("create");
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    setModalOpen(true);
  };

  const openEditModal = async (id: string | number) => {
    setMode("edit");
    setEditingId(id);
    setFormErrors({});
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    setModalOpen(true);
    setSaving(true);

    try {
      const response = await axios.get(getAdminApiRequestUrl(`${ROOT}/${id}`), { headers: headers() });
      const auditor = parseSingleAuditor(response.data);
      if (!auditor) throw new Error("Auditor details were empty.");
      setForm(buildForm(auditor));
    } catch (error) {
      setModalOpen(false);
      pushToast(getErrorMessage(error, "Unable to load auditor details."), "error");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (id: string | number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedAuditor(null);
    try {
      const response = await axios.get(getAdminApiRequestUrl(`${ROOT}/${id}`), { headers: headers() });
      const auditor = parseSingleAuditor(response.data);
      if (!auditor) throw new Error("Auditor details were empty.");
      setSelectedAuditor(auditor);
    } catch (error) {
      setDetailOpen(false);
      pushToast(getErrorMessage(error, "Unable to open auditor details."), "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setFormErrors({});
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});

    const payload: Record<string, string | number> = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      address: form.address.trim(),
      bio: form.bio.trim(),
      specialization: "auditor",
    };

    if (form.years_of_experience.trim()) {
      payload.years_of_experience = Number(form.years_of_experience);
    }

    if (mode === "create" || form.password.trim()) {
      payload.password = form.password;
      payload.password_confirmation = form.password_confirmation;
    }

    try {
      if (mode === "create") {
        await axios.post(getAdminApiRequestUrl(ROOT), payload, { headers: headers() });
        pushToast("Auditor created successfully.", "success");
        setModalOpen(false);
        setForm(initialForm);
        await loadAuditors(1);
      } else if (editingId != null) {
        await axios.put(getAdminApiRequestUrl(`${ROOT}/${editingId}`), payload, { headers: headers() });
        pushToast("Auditor updated successfully.", "success");
        setModalOpen(false);
        await loadAuditors(page);
      }
    } catch (error) {
      const nextFieldErrors = parseFormErrors(error);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFormErrors(nextFieldErrors);
      }
      pushToast(getErrorMessage(error, `Unable to ${mode} auditor.`), "error");
    } finally {
      setSaving(false);
    }
  };

  const removeAuditor = async (id: string | number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this auditor?")) return;
    setDeletingId(id);
    try {
      await axios.delete(getAdminApiRequestUrl(`${ROOT}/${id}`), { headers: headers() });
      pushToast("Auditor deleted successfully.", "success");
      const nextPage = auditors.length === 1 && page > 1 ? page - 1 : page;
      await loadAuditors(nextPage);
    } catch (error) {
      pushToast(getErrorMessage(error, "Unable to delete auditor."), "error");
    } finally {
      setDeletingId(null);
    }
  };

  const detailProfile = isRecord(selectedAuditor?.auditor_profile)
    ? (selectedAuditor?.auditor_profile as AuditorProfile)
    : null;
  const passwordFields: PasswordToggleField[] = [
    {
      key: "password",
      label: "Password",
      placeholder: "Password",
      visible: showPassword,
      toggle: setShowPassword,
    },
    {
      key: "password_confirmation",
      label: "Password Confirmation",
      placeholder: "Password confirmation",
      visible: showPasswordConfirmation,
      toggle: setShowPasswordConfirmation,
    },
  ];

  return (
    <div className={`relative min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 md:p-8 lg:p-10 dark:bg-transparent dark:text-white ${isRTL ? "text-right" : ""}`}>
      <header className={`mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${isRTL ? "lg:flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <div className={`mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/15 bg-indigo-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 ${isRTL ? "flex-row-reverse" : ""}`}>
            <ShieldCheck className="h-3 w-3" />
            {t("adm.security_gov")}
          </div>
          <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">
            {t("adm.overview")} <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-500 to-cyan-500">{t("mng.auditors")}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-white/55">
            Create, review, update, and delete auditors from one fast control surface backed by the live super-admin APIs.
          </p>
        </div>

        <div className={`flex flex-col gap-3 sm:flex-row ${isRTL ? "sm:flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={() => void loadAuditors(page, true)}
            disabled={refreshing || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white ${isRTL ? "flex-row-reverse" : ""}`}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <Plus className="h-4 w-4" />
            Add Auditor
          </button>
        </div>
      </header>

      <div className="mb-6">
        <label className="group relative block">
          <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-500 ${isRTL ? "right-4" : "left-4"}`} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search auditors by name, email, phone, or specialization"
            className={`w-full rounded-[1.75rem] border border-slate-200 bg-white py-4 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5 ${isRTL ? "pr-11 pl-4 text-right" : "pl-11 pr-4"}`}
          />
        </label>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredAuditors.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-white/10 dark:bg-white/5">
          <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-2xl font-black">{query.trim() ? "No matching auditors" : "No auditors yet"}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
            {query.trim() ? "Try a different search term or refresh the page." : "Create your first auditor to populate this workspace."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredAuditors.map((auditor, index) => {
            const id = auditorId(auditor);
            const profile = isRecord(auditor.auditor_profile) ? (auditor.auditor_profile as AuditorProfile) : null;
            return (
              <motion.div
                key={String(id ?? index)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
                      <UserCircle className="h-7 w-7" />
                    </div>
                    <div className={isRTL ? "text-right" : ""}>
                      <h2 className="text-xl font-black tracking-tight">{toText(auditor.name) || "Unnamed auditor"}</h2>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-500">{toText(profile?.specialization) || "Auditor"}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <button
                      type="button"
                      onClick={() => (id != null ? void openDetails(id) : undefined)}
                      className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:text-white/70"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => (id != null ? void openEditModal(id) : undefined)}
                      className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:text-white/70"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => (id != null ? void removeAuditor(id) : undefined)}
                      disabled={deletingId === id}
                      className="rounded-xl border border-rose-200 p-3 text-rose-500 transition hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30"
                    >
                      {deletingId === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { icon: Mail, label: "Email", value: toText(auditor.email) || "Not set" },
                    { icon: Phone, label: "Phone", value: toText(auditor.phone) || "Not set" },
                    { icon: Briefcase, label: "Experience", value: toText(profile?.years_of_experience) ? `${toText(profile?.years_of_experience)} years` : "Not set" },
                    { icon: CalendarDays, label: "Created", value: formatDateTime(auditor.created_at) },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 ${isRTL ? "text-right" : ""}`}
                    >
                      <div className={`mb-2 flex items-center gap-2 text-slate-400 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <item.icon className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className={`mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 ${isRTL ? "text-right" : ""}`}>
                  <div className={`mb-2 flex items-center gap-2 text-slate-400 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <MapPin className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Address</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-white">{toText(auditor.address) || "Not set"}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className={`mt-8 flex items-center justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        <p className="text-sm font-bold text-slate-500 dark:text-white/50">
          Page {page} of {totalPages}
        </p>
        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={() => void loadAuditors(page - 1)}
            disabled={page <= 1 || loading || refreshing}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => void loadAuditors(page + 1)}
            disabled={page >= totalPages || loading || refreshing}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
          >
            Next
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close modal overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-4 top-6 z-50 mx-auto max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
            >
              <div className={`flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-white/10 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">
                    {mode === "create" ? "Create Auditor" : "Update Auditor"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {mode === "create" ? "New auditor profile" : "Edit auditor"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-white/10 dark:text-white/70"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={submitForm} className="max-h-[calc(92vh-88px)] overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ["name", "Name", "Auditor name", "text"],
                    ["email", "Email", "auditor@example.com", "email"],
                    ["phone", "Phone", "+966...", "text"],
                    ["date_of_birth", "Date of Birth", "", "date"],
                    ["years_of_experience", "Years of Experience", "5", "number"],
                  ].map(([key, label, placeholder, type]) => {
                    const field = key as keyof FormState;
                    return (
                      <label key={key} className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
                        <input
                          type={type}
                          value={form[field]}
                          onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                          placeholder={placeholder}
                          className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:bg-white/5 ${formErrors[field] ? "border-rose-400" : "border-slate-200 dark:border-white/10"} ${isRTL ? "text-right" : ""}`}
                        />
                        {formErrors[field] ? <p className="mt-2 text-xs font-semibold text-rose-500">{formErrors[field]}</p> : null}
                      </label>
                    );
                  })}

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Specialization</span>
                    <input
                      value="auditor"
                      readOnly
                      className={`w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white/60 ${isRTL ? "text-right" : ""}`}
                    />
                  </label>

                  {passwordFields.map(({ key, label, placeholder, visible, toggle }) => {
                    const field: keyof FormState = key;
                    return (
                      <label key={key} className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
                        <div className="relative">
                          <input
                            type={visible ? "text" : "password"}
                            value={form[field]}
                            onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                            placeholder={placeholder}
                            className={`w-full rounded-2xl border px-4 py-3 pr-12 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:bg-white/5 ${formErrors[field] ? "border-rose-400" : "border-slate-200 dark:border-white/10"} ${isRTL ? "text-right" : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => toggle((prev) => !prev)}
                            className={`absolute top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:text-indigo-600 ${isRTL ? "left-3" : "right-3"}`}
                            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
                          >
                            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {formErrors[field] ? <p className="mt-2 text-xs font-semibold text-rose-500">{formErrors[field]}</p> : null}
                      </label>
                    );
                  })}

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Gender</span>
                    <select
                      value={form.gender}
                      onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                      className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5 ${isRTL ? "text-right" : ""}`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    {formErrors.gender ? <p className="mt-2 text-xs font-semibold text-rose-500">{formErrors.gender}</p> : null}
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Address</span>
                    <input
                      value={form.address}
                      onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="Damascus, Syria"
                      className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:bg-white/5 ${formErrors.address ? "border-rose-400" : "border-slate-200 dark:border-white/10"} ${isRTL ? "text-right" : ""}`}
                    />
                    {formErrors.address ? <p className="mt-2 text-xs font-semibold text-rose-500">{formErrors.address}</p> : null}
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Bio</span>
                    <textarea
                      value={form.bio}
                      onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                      placeholder="Short professional summary"
                      rows={4}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:bg-white/5 ${formErrors.bio ? "border-rose-400" : "border-slate-200 dark:border-white/10"} ${isRTL ? "text-right" : ""}`}
                    />
                    {formErrors.bio ? <p className="mt-2 text-xs font-semibold text-rose-500">{formErrors.bio}</p> : null}
                  </label>
                </div>

                <div className={`mt-6 flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    {mode === "create" ? "Create Auditor" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-white/70"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detailOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close detail overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: isRTL ? -420 : 420 }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? -420 : 420 }}
              className={`fixed top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-white/10 bg-white p-6 shadow-2xl dark:bg-slate-950 ${isRTL ? "left-0 border-r" : "right-0 border-l"}`}
            >
              <div className={`mb-6 flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">Auditor Details</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">{toText(selectedAuditor?.name) || "Loading auditor..."}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-white/10 dark:text-white/70"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {detailLoading ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                </div>
              ) : selectedAuditor ? (
                <div className="space-y-4">
                  {[
                    { icon: Mail, label: "Email", value: toText(selectedAuditor.email) || "Not set" },
                    { icon: Phone, label: "Phone", value: toText(selectedAuditor.phone) || "Not set" },
                    { icon: CalendarDays, label: "Date of Birth", value: parseDateInput(selectedAuditor.date_of_birth) || "Not set" },
                    { icon: Briefcase, label: "Specialization", value: toText(detailProfile?.specialization) || "Not set" },
                    { icon: Sparkles, label: "Experience", value: toText(detailProfile?.years_of_experience) ? `${toText(detailProfile?.years_of_experience)} years` : "Not set" },
                    { icon: MapPin, label: "Address", value: toText(selectedAuditor.address) || "Not set" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className={`mb-2 flex items-center gap-2 text-slate-400 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <item.icon className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                      </div>
                      <p className="text-sm font-bold">{item.value}</p>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className={`mb-2 flex items-center gap-2 text-slate-400 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bio</span>
                    </div>
                    <p className="text-sm font-bold">{toText(detailProfile?.bio) || "Not set"}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isRTL ? "text-right" : ""}`}>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Created</p>
                        <p className="mt-1 text-sm font-bold">{formatDateTime(selectedAuditor.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Updated</p>
                        <p className="mt-1 text-sm font-bold">{formatDateTime(selectedAuditor.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 top-5 z-70 flex justify-center px-4">
        <div className="w-full max-w-md space-y-3">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                className={`pointer-events-auto rounded-4xl border px-4 py-3 shadow-xl ${
                  toast.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : toast.tone === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="flex-1 text-sm font-semibold">{toast.message}</p>
                  <button
                    type="button"
                    onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
                    className="rounded-full p-1 transition hover:bg-black/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
