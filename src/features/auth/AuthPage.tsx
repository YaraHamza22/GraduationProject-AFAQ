"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, MapPin, Phone, ChevronDown, ArrowRight, ArrowLeft, GraduationCap, Briefcase, ShieldCheck, Crosshair, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

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
  const [role, setRole] = useState("Student");
  const [address, setAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login and redirect based on role
    if (role === "Instructor") {
      router.push("/instructor");
    } else if (role === "Manager") {
      router.push("/manager/dashboard");
    } else if (role === "Student") {
      router.push("/student");
    } else {
      router.push("/instructor"); // Default fallback
    }
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
            setAddress(data.display_name);
          } else {
            setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
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

  const toggleAuth = () => {
    setIsLogin(!isLogin);
    // Truly randomize gradient on flip
    setGradientIdx(Math.floor(Math.random() * gradients.length));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans transition-colors duration-300">
      {/* Theme Toggle for Dev/Preview */}
      <div className="absolute top-4 right-4 z-50">
        <button 
           onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
           className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-lg"
        >
          {mounted && (theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />)}
        </button>
      </div>

      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />

      <motion.div
        layout
        transition={{
          layout: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
        }}
        className={`relative w-full max-w-5xl h-[750px] flex shadow-[0_32px_64px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.5)] rounded-[40px] overflow-hidden glass border border-slate-300 dark:border-white/10 ${!isLogin ? "flex-row-reverse" : "flex-row"
          }`}
      >
        {/* Form Side */}
        <motion.div
          layout
          className="w-full md:w-1/2 h-full flex flex-col p-8 md:p-14 z-10 bg-white/80 dark:bg-slate-950/40 backdrop-blur-2xl"
        >
          <Link href="/" className="flex items-center gap-2 mb-10 group w-fit">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all duration-300">
              <ArrowLeft className="w-5 h-5 text-white/50 group-hover:text-indigo-400" />
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
              <h1 className="text-5xl font-extrabold mb-3 tracking-tight text-slate-900 dark:text-white">
                {isLogin ? "Hello Again!" : "Get Started"}
              </h1>
              <p className="text-slate-500 dark:text-white/40 mb-10 text-lg">
                {isLogin
                  ? "Welcome back, you've been missed!"
                  : "Start your creative journey with us today."}
              </p>

              <form className="space-y-5" onSubmit={handleLogin}>
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Full Name</label>
                    <div className="group relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="text"
                        placeholder="Yara Al-Sayed"
                        className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Email Address</label>
                  <div className="group relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="email"
                      placeholder="yara@example.com"
                      className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider">Password</label>
                    {isLogin && <button className="text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:text-indigo-300 transition-colors">FORGOT PASSWORD?</button>}
                  </div>
                  <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-4 pt-2">
                      <label className="text-sm font-semibold text-white/60 ml-1 uppercase tracking-wider block">Join as</label>
                      <div className="flex gap-3">
                        {[
                          { id: "Student", icon: GraduationCap },
                          { id: "Instructor", icon: Briefcase },
                          { id: "Manager", icon: ShieldCheck },
                        ].map((r) => {
                          const Icon = r.icon;
                          const isActive = role === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setRole(r.id)}
                              className={`flex-1 py-3 px-2 rounded-2xl border transition-all duration-500 flex flex-col items-center justify-center gap-2 ${isActive
                                  ? `bg-indigo-500/10 border-indigo-500/50 text-indigo-600 dark:text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]`
                                  : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400 dark:text-white/30 hover:bg-slate-100 dark:hover:bg-white/10"
                                }`}
                            >
                              <Icon className={`w-5 h-5 ${isActive ? "text-indigo-500 dark:text-indigo-400" : "text-slate-300 dark:text-white/20"}`} />
                              <span className={`text-[10px] uppercase font-black tracking-tighter ${isActive ? "text-indigo-600 dark:text-white" : "text-slate-400 dark:text-white/30"}`}>{r.id}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-sm font-semibold text-white/60 uppercase tracking-wider">Exact Home Address</label>
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          className="text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20"
                        >
                          {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                          {isLocating ? "LOCATING..." : "LOCATE ME"}
                        </button>
                      </div>
                      <div className="group relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Building No, Street Name, District, City"
                          className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Phone Number</label>
                        <div className="group relative flex items-center">
                           <div className="absolute left-4 flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-white/10">
                            <SyrianFlag />
                            <span className="text-xs font-bold text-slate-300 dark:text-white/40 tracking-tighter transition-colors group-focus-within:text-indigo-400">+963</span>
                          </div>
                          <input
                            type="tel"
                            placeholder="09XXXXXXXX"
                            maxLength={10}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-[110px] pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all text-sm placeholder:text-slate-300 dark:placeholder:text-white/10 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-500 dark:text-white/60 ml-1 uppercase tracking-wider">Gender</label>
                         <div className="relative group">
                          <select className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none text-slate-900 dark:text-white/70 text-sm cursor-pointer">
                            <option value="" className="bg-white dark:bg-slate-900">Select...</option>
                            <option value="male" className="bg-white dark:bg-slate-900">Male</option>
                            <option value="female" className="bg-white dark:bg-slate-900">Female</option>
                            <option value="other" className="bg-white dark:bg-slate-900">Prefer not to say</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-400 pointer-events-none transition-colors" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <button className={`w-full bg-linear-to-r ${gradients[gradientIdx]} hover:brightness-110 shadow-2xl text-white font-bold py-5 rounded-2xl transition-all transform active:scale-[0.98] mt-6 flex items-center justify-center gap-3 text-lg`}>
                  {isLogin ? "Sign In" : "Register Account"}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

               <div className="mt-auto pt-10 text-center">
                <p className="text-slate-400 dark:text-white/40 font-medium">
                  {isLogin ? "Don't have an account yet?" : "Already have an account?"}{" "}
                  <button
                    onClick={toggleAuth}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-8 decoration-indigo-500/30 hover:decoration-indigo-400 transition-all"
                  >
                    {isLogin ? "Create one now" : "Go to Login"}
                  </button>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Gradient Side */}
        <motion.div
          layout
          className={`hidden md:block w-1/2 h-full relative overflow-hidden transition-all duration-1000 bg-linear-to-br ${gradients[gradientIdx]}`}
        >
          {/* Decorative Elements */}
          <div className="absolute inset-0 z-0">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 45, 0],
                x: [0, 20, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/4 -right-1/4 w-[120%] h-[120%] bg-white/10 rounded-full blur-[100px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                y: [0, -30, 0]
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-black/10 rounded-full blur-[80px]"
            />
          </div>

          <div className="relative z-20 h-full flex flex-col justify-center items-center text-center p-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? "msg-login" : "msg-register"}
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <div className="inline-block p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 mb-4">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-6xl font-black text-white leading-tight tracking-tighter">
                  {isLogin ? "Welcome\nBack!" : "Join the\nFuture."}
                </h2>
                <div className="w-16 h-1.5 bg-white rounded-full mx-auto" />
                <p className="text-white/80 text-xl font-medium max-w-sm mx-auto leading-relaxed">
                  {isLogin
                    ? "Enter your details to pick up where you left off. Your journey continues here."
                    : "Create your account and start exploring a world of knowledge tailored for you."}
                </p>

                <div className="flex gap-3 justify-center mt-10">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                      className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Grain Effect */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
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
