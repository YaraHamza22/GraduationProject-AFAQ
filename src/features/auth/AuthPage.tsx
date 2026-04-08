"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, MapPin, Phone, ChevronDown, ArrowRight, ArrowLeft, Loader2, Crosshair, Calendar, BookOpen, Globe, FileText, Star, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import axios from "axios";

const SyrianFlag = () => (
  <svg width="24" height="16" viewBox="0 0 3 2" className="rounded-sm shadow-sm">
    <rect width="3" height="2" fill="#3D8E33" />
    <rect y=".667" width="3" height=".667" fill="#FFF" />
    <rect y="1.333" width="3" height=".667" fill="#000" />
    <path d="M0.75 0.85 L0.81 1.03 L1.0 1.03 L0.85 1.14 L0.91 1.32 L0.75 1.21 L0.59 1.32 L0.65 1.14 L0.5 1.03 L0.69 1.03 Z" fill="#CE1126" />
    <path d="M1.5 0.85 L1.56 1.03 L1.75 1.03 L1.6 1.14 L1.66 1.32 L1.5 1.21 L1.34 1.32 L1.4 1.14 L1.25 1.03 L1.44 1.03 Z" fill="#CE1126" />
    <path d="M2.25 0.85 L2.31 1.03 L2.5 1.03 L2.35 1.14 L2.41 1.32 L2.25 1.21 L2.09 1.32 L2.15 1.14 L2.0 1.03 L2.19 1.03 Z" fill="#CE1126" />
  </svg>
);

const gradients = [
  "from-indigo-600 via-purple-600 to-pink-600",
  "from-emerald-500 via-teal-600 to-cyan-600",
  "from-orange-500 via-rose-500 to-fuchsia-600",
  "from-blue-600 via-indigo-700 to-violet-800",
  "from-violet-600 via-fuchsia-600 to-indigo-600",
  "from-cyan-500 via-blue-600 to-indigo-700",
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [gradientIdx, setGradientIdx] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    education_level: "",
    address: "",
    country: "",
    bio: "",
    specialization: "",
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: [] }));
    }
    setGeneralError(null);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.display_name) {
            setFormData((prev) => ({ ...prev, address: data.display_name }));
          } else {
            setFormData((prev) => ({ ...prev, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          alert("Could not fetch address details. Please enter manually.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn("Geolocation warning:", error.message);
        setIsLocating(false);
        let msg = "Location access denied or unavailable.";
        if (error.code === 1) msg = "Please allow location access in your browser settings.";
        else if (error.code === 2) msg = "Could not determine your location. Please check your signal.";
        else if (error.code === 3) msg = "Location request timed out.";
        alert(msg);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    if (isLogin) {
      setIsLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const payload = {
          email: formData.email,
          password: formData.password
        };
        
        const response = await axios.post(`${apiUrl}/auth/login`, payload, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        // Save token if provided by backend
        if (response.data && response.data.data && response.data.data.token) {
           localStorage.setItem('auth_token', response.data.data.token);
        }

        setSuccessMessage("Login successful! Redirecting...");
        
        setTimeout(() => {
           router.push("/student");
        }, 1500); // 1.5 seconds delay for snackbar

      } catch (error) {
        console.error("Login error:", error);
        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 422 || error.response.status === 401) {
             setGeneralError(error.response.data.message || "Invalid credentials. Please try again.");
          } else {
             setGeneralError('An unexpected error occurred from the server.');
          }
        } else {
          setGeneralError('Network error. Please check your connection and the API server.');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        // Ensure the phone number starts with +963 if it doesn't already
        let formattedPhone = formData.phone;
        if (formattedPhone && !formattedPhone.startsWith('+')) {
          // If the user typed 09... remove the leading 0 before prepending +963
          formattedPhone = '+963' + formattedPhone.replace(/^0/, '');
        }

        const payload = {
          ...formData,
          phone: formattedPhone
        };
        
        await axios.post(`${apiUrl}/auth/register`, payload, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        setIsLogin(true);
        setSuccessMessage('Registration successful! You can now log in.');
        setTimeout(() => setSuccessMessage(null), 4000);
        
      } catch (error) {
        console.error("Registration error:", error);
        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 422) {
             setErrors(error.response.data.errors || {});
             setGeneralError("Please fix the validation errors below.");
          } else {
             setGeneralError(error.response.data.message || 'An unexpected error occurred from the server.');
          }
        } else {
          setGeneralError('Network error. Please check your connection and the API server.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleAuth = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setGeneralError(null);
    setGradientIdx(Math.floor(Math.random() * gradients.length));
    setFormData({
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      phone: "",
      date_of_birth: "",
      gender: "",
      education_level: "",
      address: "",
      country: "",
      bio: "",
      specialization: "",
    });
  };

  const ErrorMessage = ({ name }: { name: string }) => {
    if (!errors[name] || errors[name].length === 0) return null;
    return <p className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1 font-medium">{errors[name][0]}</p>;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans transition-colors duration-300">
      <div className="absolute top-4 right-4 z-50">
        <button 
           onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
           className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-lg"
        >
          {mounted && (theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />)}
        </button>
      </div>

      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />

      <motion.div
        layout
        transition={{
          layout: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
        }}
        className={`relative w-full max-w-5xl h-[750px] flex shadow-[0_32px_64px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.5)] rounded-[60px] overflow-hidden glass border border-slate-300 dark:border-white/10 ${!isLogin ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Form Side */}
        <motion.div
          layout
          className="w-full md:w-1/2 h-full flex flex-col p-8 md:p-14 z-10 bg-white/80 dark:bg-slate-950/40 backdrop-blur-2xl"
        >
          <Link href="/" className="flex items-center gap-2 mb-8 group w-fit">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all duration-300">
              <ArrowLeft className="w-5 h-5 text-slate-400 dark:text-white/50 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
            </div>
            <span className="text-slate-400 dark:text-white/40 group-hover:text-slate-900 dark:group-hover:text-white transition-colors font-medium">Back to Home</span>
          </Link>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isLogin ? "login" : "register"}
              initial={{ x: isLogin ? -30 : 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isLogin ? 30 : -30, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex-1 overflow-y-auto pr-3 custom-scrollbar flex flex-col"
            >
              <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight text-slate-900 dark:text-white">
                {isLogin ? "Hello Again!" : "Student Register"}
              </h1>
              <p className="text-slate-500 dark:text-white/40 mb-6 text-lg">
                {isLogin
                  ? "Welcome back, you've been missed!"
                  : "Start your learning journey with us today."}
              </p>

              {generalError && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm font-medium">{generalError}</p>
                </div>
              )}

              <AnimatePresence mode="wait">
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-lg shadow-emerald-500/10"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">{successMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form className="space-y-4 pb-4" onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Full Name *</label>
                      <div className="group relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="First Last" required
                          className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.name ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white text-sm`}
                        />
                      </div>
                      <ErrorMessage name="name" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Email Address *</label>
                      <div className="group relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required
                          className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.email ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white text-sm`}
                        />
                      </div>
                      <ErrorMessage name="email" />
                    </div>
                  </div>
                )}

                {isLogin && (
                   <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Email Address</label>
                      <div className="group relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="yara@example.com" required
                          className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white"
                        />
                      </div>
                   </div>
                )}

                <div className={!isLogin ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-2"}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider">Password {isLogin ? '' : '*'}</label>
                      {isLogin && <button type="button" className="text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:text-indigo-300 transition-colors">FORGOT?</button>}
                    </div>
                    <div className="group relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLogin ? 'w-5 h-5' : 'w-4 h-4'} text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors`} />
                      <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required
                        className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.password ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} ${isLogin ? 'rounded-2xl py-4 pl-12' : 'rounded-xl py-3 pl-10'} pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white text-sm`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none">
                        {showPassword ? <EyeOff className={isLogin ? 'w-5 h-5' : 'w-4 h-4'} /> : <Eye className={isLogin ? 'w-5 h-5' : 'w-4 h-4'} />}
                      </button>
                    </div>
                    {!isLogin && <ErrorMessage name="password" />}
                  </div>

                  {!isLogin && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Confirm Password *</label>
                      <div className="group relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                        <input type={showConfirmPassword ? "text" : "password"} name="password_confirmation" value={formData.password_confirmation} onChange={handleChange} placeholder="••••••••" required
                          className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.password_confirmation ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white text-sm`}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <ErrorMessage name="password_confirmation" />
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Date of Birth</label>
                        <div className="group relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                          <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange}
                            className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.date_of_birth ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all text-slate-900 dark:text-white/70 text-sm`}
                          />
                        </div>
                        <ErrorMessage name="date_of_birth" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Gender</label>
                         <div className="relative group">
                          <select name="gender" value={formData.gender} onChange={handleChange} className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.gender ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none text-slate-900 dark:text-white/70 text-sm cursor-pointer`}>
                            <option value="" className="bg-white dark:bg-slate-900">Select...</option>
                            <option value="male" className="bg-white dark:bg-slate-900">Male</option>
                            <option value="female" className="bg-white dark:bg-slate-900">Female</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 pointer-events-none transition-colors" />
                        </div>
                        <ErrorMessage name="gender" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Phone</label>
                        <div className="group relative flex items-center">
                           <div className="absolute left-4 flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-white/10 z-10">
                            <SyrianFlag />
                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/50 group-focus-within:text-indigo-400">+963</span>
                          </div>
                          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="9XXXXXXXX" maxLength={10}
                            className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.phone ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-[90px] pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all text-sm placeholder:text-slate-300 dark:placeholder:text-white/10 text-slate-900 dark:text-white`}
                          />
                        </div>
                        <ErrorMessage name="phone" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Country</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 w-4 h-4">
                            {formData.country === "Syria" ? <SyrianFlag /> : <Globe className="w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />}
                          </div>
                          <select name="country" value={formData.country} onChange={handleChange}
                            className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.country ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none text-slate-900 dark:text-white/70 text-sm cursor-pointer`}
                          >
                            <option value="" className="bg-white dark:bg-slate-900">Select...</option>
                            <option value="Syria" className="bg-white dark:bg-slate-900">Syria</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 pointer-events-none transition-colors" />
                        </div>
                        <ErrorMessage name="country" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center ml-1 mb-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider">Home Address</label>
                        <button type="button" onClick={handleGetLocation} disabled={isLocating} className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                          {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                          {isLocating ? "LOCATING..." : "LOCATE ME"}
                        </button>
                      </div>
                      <div className="group relative">
                        <MapPin className="absolute left-4 top-5 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                        <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Building No, Street, City" rows={2}
                          className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.address ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white text-sm resize-none custom-scrollbar`}
                        />
                      </div>
                      <ErrorMessage name="address" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Education Level</label>
                        <div className="relative group">
                          <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 pointer-events-none transition-colors z-10" />
                          <select name="education_level" value={formData.education_level} onChange={handleChange}
                            className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.education_level ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none text-slate-900 dark:text-white/70 text-sm cursor-pointer`}
                          >
                            <option value="" className="bg-white dark:bg-slate-900">Select...</option>
                            <option value="highschool" className="bg-white dark:bg-slate-900">High School</option>
                            <option value="associate" className="bg-white dark:bg-slate-900">Associate's Degree</option>
                            <option value="bachelor" className="bg-white dark:bg-slate-900">Bachelor's Degree</option>
                            <option value="master" className="bg-white dark:bg-slate-900">Master's Degree</option>
                            <option value="doctorate" className="bg-white dark:bg-slate-900">Doctorate Degree</option>
                            <option value="other" className="bg-white dark:bg-slate-900">Other</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 pointer-events-none transition-colors" />
                        </div>
                        <ErrorMessage name="education_level" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Specialization</label>
                        <div className="relative group">
                          <Star className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 pointer-events-none transition-colors z-10" />
                          <select name="specialization" value={formData.specialization} onChange={handleChange}
                            className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.specialization ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none text-slate-900 dark:text-white/70 text-sm cursor-pointer`}
                          >
                            <option value="" className="bg-white dark:bg-slate-900">Select...</option>
                            <option value="Engineering in Information Technology" className="bg-white dark:bg-slate-900">Engineering in Information Technology</option>
                            <option value="Computer Science" className="bg-white dark:bg-slate-900">Computer Science</option>
                            <option value="Business Administration" className="bg-white dark:bg-slate-900">Business Administration</option>
                            <option value="Medicine" className="bg-white dark:bg-slate-900">Medicine</option>
                            <option value="Law" className="bg-white dark:bg-slate-900">Law</option>
                            <option value="Arts & Humanities" className="bg-white dark:bg-slate-900">Arts & Humanities</option>
                            <option value="Other" className="bg-white dark:bg-slate-900">Other</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 pointer-events-none transition-colors" />
                        </div>
                        <ErrorMessage name="specialization" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Bio</label>
                      <div className="group relative">
                        <FileText className="absolute left-4 top-5 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                        <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." rows={2}
                          className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.bio ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white text-sm resize-none custom-scrollbar`}
                        />
                      </div>
                      <ErrorMessage name="bio" />
                    </div>
                  </>
                )}

                <button disabled={isLoading} className={`w-full bg-linear-to-r ${gradients[gradientIdx]} hover:brightness-110 shadow-2xl text-white font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] mt-4 flex items-center justify-center gap-3 text-base disabled:opacity-70 disabled:cursor-not-allowed`}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Sign In" : "Register Account"}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

               <div className="mt-auto pt-6 pb-2 text-center">
                <p className="text-slate-500 dark:text-white/40 font-medium text-sm">
                  {isLogin ? "Don't have an account yet?" : "Already have an account?"}{" "}
                  <button
                    onClick={toggleAuth}
                    type="button"
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/30 hover:decoration-indigo-400 transition-all ml-1"
                  >
                    {isLogin ? "Create one now" : "Go to Login"}
                  </button>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Visual Side */}
        <motion.div
          layout
          className="hidden md:flex w-1/2 h-full flex-col relative overflow-hidden transition-all duration-1000"
        >
          {/* Top Half - Study Image */}
          <div className="h-[60%] relative overflow-hidden z-30 rounded-b-[100px] shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
            <motion.img 
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200" 
              className="absolute inset-0 w-full h-full object-cover blur-[0.2px]"
              alt="Studying"
            />
            <div className="absolute inset-0 bg-indigo-900/30 mix-blend-overlay" />
            <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/20 to-transparent" />
            
            <div className="relative z-10 h-full flex flex-col justify-center items-center">
               <motion.h2 
                 key={isLogin ? "welcome" : "join"}
                 initial={{ y: 50, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
                 className="text-7xl lg:text-[110px] font-black text-white leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] select-none -translate-y-8"
               >
                 {isLogin ? "Welcome" : "Join the"}
               </motion.h2>
            </div>
          </div>

          {/* Bottom Half - Gradient & Info */}
          <div className={`h-[50%] -mt-20 relative bg-linear-to-br transition-all duration-1000 z-10 ${gradients[gradientIdx]}`}>
            {/* Decorative Elements */}
            <div className="absolute inset-0 z-0">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 45, 0],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/4 -right-1/4 w-[120%] h-[120%] bg-white/10 rounded-full blur-[100px]"
              />
            </div>

            <div className="relative z-10 h-full flex flex-col items-center text-center px-16 pt-24 pb-12">
              <motion.h2 
                 initial={{ y: -50, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.7, duration: 0.8, ease: "circOut" }}
                 className="text-7xl lg:text-[110px] font-black text-white leading-none tracking-tighter drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)] select-none"
              >
                 {isLogin ? "Back!" : "Future."}
              </motion.h2>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? "msg-login" : "msg-register"}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="mt-6 space-y-6"
                >
                  <div className="w-12 h-1 bg-white/40 mx-auto rounded-full" />
                  <p className="text-white/90 text-lg font-medium max-w-sm mx-auto leading-relaxed drop-shadow-md">
                    {isLogin
                      ? "Enter your details to pick up where you left off. Your journey continues here."
                      : "Create your account and start exploring a world of knowledge tailored for you."}
                  </p>
                  
                  <div className="flex gap-2 justify-center pt-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                        className="w-1.5 h-1.5 rounded-full bg-white shadow-sm"
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Grain Effect */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
          </div>
        </motion.div>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
