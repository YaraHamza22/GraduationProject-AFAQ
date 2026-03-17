"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles, Lock, Mail, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AdminLoginScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulation
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 sm:p-12 overflow-hidden selection:bg-indigo-500/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-indigo-600/20 blur-[150px] rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 12, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-purple-600/10 blur-[150px] rounded-full"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-5xl h-full sm:h-[700px] flex flex-col md:flex-row bg-white/2 backdrop-blur-3xl border border-white/5 rounded-[48px] overflow-hidden shadow-2xl">
        
        {/* Visual Side */}
        <div className="hidden md:flex w-1/2 h-full bg-linear-to-br from-indigo-600 to-violet-700 relative p-16 flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 z-0">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/10 blur-[100px] rounded-full" 
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">
                Afaq <span className="text-white/40 italic">Admin</span>
              </span>
            </div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
                Command the <br /> 
                <span className="text-white/50">Next Horizon.</span>
              </h1>
              <p className="text-indigo-100/60 text-lg max-w-md leading-relaxed font-medium">
                Welcome to the specialized administrative hub. Secure, intuitive, and built for ultimate control.
              </p>
            </motion.div>
          </div>

          <div className="relative z-10 flex items-center gap-8">
            <div className="flex -space-x-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-400" />
              ))}
            </div>
            <p className="text-indigo-100/40 text-sm font-bold tracking-widest uppercase italic">
              Trusted by 100+ System Leads
            </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 h-full p-8 sm:p-16 flex flex-col justify-center">
          <div className="mb-12">
            <Link href="/" className="group flex items-center gap-2 text-white/40 hover:text-white transition-all w-fit mb-8">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Return to Gateway</span>
            </Link>
            
            <h2 className="text-4xl font-black text-white mb-3">Admin Access</h2>
            <p className="text-white/30 text-sm font-medium">Please authorize with your security credentials.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Secure Identifier</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="email"
                  required
                  placeholder="admin.id@afaq.edu"
                  className="w-full bg-white/3 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Encrypted Pass</label>
                <button type="button" className="text-[10px] text-indigo-400 font-black uppercase hover:text-indigo-300 transition-colors">Vault Recovery</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-white/3 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium"
                />
              </div>
            </div>

            <button 
              disabled={isLoading}
              className="w-full group bg-white text-indigo-950 font-black py-6 rounded-3xl mt-8 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest">Initialize Authorization</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-16 flex items-center justify-center gap-6 opacity-30">
            <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3" />
              End-to-End Encryption
            </p>
            <div className="w-1 h-1 bg-white rounded-full" />
            <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Quantum Auth Ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
