"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Shield, Sparkles, Lock, Mail, ArrowRight, ArrowLeft, Loader2, Orbit, Fingerprint, Box } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function AdminLoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  // Futuristic Cursor Follow Effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    setTimeout(() => setIsScanning(false), 2000); // Simulated system scan
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/admin/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] flex items-center justify-center p-4 md:p-8 overflow-hidden relative selection:bg-indigo-500/50 transition-colors duration-500">
      
      {/* 2027 IMMERSIVE BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
        {/* Dynamic Nebula */}
        <motion.div 
          style={{ x: springX, y: springY }}
          className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
        >
          <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/10 dark:bg-indigo-600/20 blur-[180px] rounded-full animate-pulse" />
          <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-purple-600/10 dark:bg-purple-600/20 blur-[160px] rounded-full animate-float" />
        </motion.div>
        
        {/* Geometric Space Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_20%,transparent_100%)] opacity-30 dark:opacity-20" />
        
        {/* Grainy Noise Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay pointer-events-none" />
      </div>

      <AnimatePresence mode="wait">
        {isScanning ? (
          <motion.div 
            key="scanner"
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-50 flex flex-col items-center gap-6"
          >
            <div className="relative">
              <Orbit className="w-24 h-24 text-indigo-500 animate-[spin_4s_linear_infinite]" />
              <Fingerprint className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-slate-900 dark:text-white animate-pulse" />
            </div>
            <p className="text-slate-900 dark:text-white font-black tracking-[0.5em] text-[10px] uppercase animate-pulse">Initializing Security Protocol 2027</p>
          </motion.div>
        ) : (
          <motion.div
            key="login-portal"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className={`relative z-10 w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 overflow-hidden rounded-[56px] border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-[40px] shadow-[0_32px_120px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_120px_-15px_rgba(0,0,0,0.5)] ${isRTL ? "flex-row-reverse" : ""}`}
          >
            
            {/* HOLOGRAPHIC VISUAL PANEL */}
            <div className="hidden lg:flex relative p-20 flex-col justify-between overflow-hidden bg-indigo-50/20 dark:bg-white/[0.02]">
              <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-indigo-500/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <Link href="/" className="group flex items-center gap-4 text-slate-400 dark:text-white/40 hover:text-indigo-600 dark:hover:text-white transition-all w-fit mb-16">
                  <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-all shadow-sm">
                    <ArrowLeft className={`w-4 h-4 transition-transform ${isRTL ? "rotate-180 group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.3em]">{t("adm.return")}</span>
                </Link>

                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[24px] bg-linear-to-br from-indigo-600 to-violet-700 p-[1px]">
                      <div className="w-full h-full rounded-[23px] bg-white dark:bg-indigo-950/50 flex items-center justify-center backdrop-blur-xl">
                        <Shield className="w-8 h-8 text-indigo-600 dark:text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter leading-none mb-1">AFAQ <span className="text-indigo-500 italic">ADMIN</span></h4>
                      <p className="text-slate-400 dark:text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">{t("adm.security_gov")}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl xl:text-6xl font-black text-slate-900 dark:text-white leading-[0.9] tracking-tighter transition-all mb-4">
                      AUTHENTICATED <br />
                      <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">ACCESS ONLY.</span>
                    </h1>
                    <p className="text-slate-500 dark:text-white/40 text-lg font-medium max-w-sm leading-relaxed">
                      {t("adm.status_desc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-12">
                <div className="flex gap-4">
                  {[12, 45, 88].map((n, i) => (
                    <div key={i} className="text-center group cursor-help">
                      <p className="text-indigo-500 dark:text-indigo-400 font-black text-xl mb-1 transition-transform group-hover:-translate-y-1">{n}</p>
                      <p className="text-[9px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest leading-none">NODE_0{i}</p>
                    </div>
                  ))}
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />
                <p className="text-slate-400 dark:text-white/30 text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse">
                  System Phase: 2027_V4
                </p>
              </div>

              {/* Decorative 3D Elements */}
              <motion.div 
                animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-20 -right-20 w-80 h-80 rounded-[80px] border border-slate-200 dark:border-white/5 opacity-40 dark:opacity-20" 
              />
            </div>

            {/* NEOMORPHIC FORM PANEL */}
            <div className="relative p-10 sm:p-20 flex flex-col justify-center bg-white/10 dark:bg-black/20">
              <div className="mb-14 relative block lg:hidden">
                 <div className="flex items-center gap-3 mb-8">
                    <Shield className="w-8 h-8 text-indigo-500" />
                    <span className="text-slate-900 dark:text-white font-black tracking-tighter text-xl italic">AFAQ ADMIN</span>
                 </div>
              </div>

              <div className="space-y-12">
                <header>
                  <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">
                    {t("adm.management")}<span className="text-indigo-500 animate-pulse">.</span>
                  </h2>
                  <p className="text-slate-400 dark:text-white/40 text-sm font-medium tracking-tight">Enterprise Infrastructure Gateway</p>
                </header>

                <form onSubmit={handleLogin} className="space-y-10">
                  <div className="space-y-4 group/input">
                    <div className="flex justify-between items-end px-2">
                       <label className="text-[9px] font-black text-slate-400 dark:text-white/20 group-focus-within/input:text-indigo-500 uppercase tracking-[0.4em] transition-colors">{t("adm.secure_id")}</label>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/10 group-focus-within/input:text-indigo-500 transition-all group-focus-within/input:scale-110" />
                      <input 
                        type="email"
                        required
                        placeholder="ENTER_SECURE_UUID"
                        className={`w-full bg-transparent border-b border-slate-200 dark:border-white/10 ${isRTL ? "pr-0 text-right" : "pl-8"} py-4 text-slate-900 dark:text-white font-black text-lg placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-indigo-500 transition-all selection:bg-indigo-500 tracking-wide`}
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-indigo-500 transition-all duration-700 group-focus-within/input:w-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    </div>
                  </div>

                  <div className="space-y-4 group/input">
                    <div className="flex justify-between items-end px-2">
                       <label className="text-[9px] font-black text-slate-400 dark:text-white/20 group-focus-within/input:text-indigo-500 uppercase tracking-[0.4em] transition-colors">{t("adm.encrypted_pass")}</label>
                       <button type="button" className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 hover:border-indigo-500 transition-all shadow-xs">Vault Recovery</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/10 group-focus-within/input:text-indigo-500 transition-all group-focus-within/input:scale-110" />
                      <input 
                        type="password"
                        required
                        placeholder="••••••••••••"
                        className={`w-full bg-transparent border-b border-slate-200 dark:border-white/10 ${isRTL ? "pr-0 text-right" : "pl-8"} py-4 text-slate-900 dark:text-white font-black text-lg placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-indigo-500 transition-all selection:bg-indigo-500 tracking-wide`}
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-indigo-500 transition-all duration-700 group-focus-within/input:w-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    </div>
                  </div>

                  <button 
                    disabled={isLoading}
                    className="w-full relative group h-20 rounded-[24px] mt-6 overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-slate-900 dark:bg-white group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 transition-colors duration-500" />
                    <div className="relative flex items-center justify-center gap-4 px-8">
                       {isLoading ? (
                         <Loader2 className="w-6 h-6 animate-spin text-white dark:text-black" />
                       ) : (
                         <>
                           <span className="text-white dark:text-black group-hover:text-white font-black uppercase tracking-[0.4em] text-xs transition-colors">{t("adm.init_auth")}</span>
                           <Box className="w-4 h-4 text-white dark:text-black group-hover:text-white transition-all group-hover:rotate-90" />
                         </>
                       )}
                    </div>
                  </button>
                </form>

                <footer className="pt-10 flex items-center justify-between opacity-50 dark:opacity-20 border-t border-slate-200 dark:border-white/5">
                   <p className="text-[9px] font-black text-slate-600 dark:text-white uppercase tracking-[0.3em] flex items-center gap-2">
                     <Orbit className="w-3 h-3" />
                     GRID_SECURE
                   </p>
                   <p className="text-[9px] font-black text-slate-600 dark:text-white uppercase tracking-[0.3em]">
                     © 2027 AFAQ_SYS
                   </p>
                </footer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, -20px); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 5s ease infinite;
        }
      `}</style>
    </div>
  );
}
