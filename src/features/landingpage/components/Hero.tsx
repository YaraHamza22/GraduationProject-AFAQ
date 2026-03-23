"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Play, Sparkles, TrendingUp, Users } from "lucide-react";
import { Book3D } from "./Book3D";

// Animation Variants
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden flex items-center justify-center bg-[#020617] selection:bg-indigo-500/30">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" />
      <div className="absolute bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />

      {/* Immersive 3D Background */}
      <div 
        className="absolute inset-0 z-0 opacity-50 mix-blend-lighten pointer-events-none"
        style={{ WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)', maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)' }}
      >
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 15], fov: 45 }}>
          <Suspense fallback={null}>
            <Book3D />
          </Suspense>
        </Canvas>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 pt-20 pb-32 flex flex-col items-center justify-center text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-4xl flex flex-col items-center"
        >
          {/* Eyebrow Badge */}
          <motion.div variants={fadeUp} className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/3 border border-white/8 backdrop-blur-md hover:bg-white/6 transition-colors cursor-default">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-slate-300 tracking-wide">The Future of Digital Education</span>
            </div>
          </motion.div>
          
          {/* Main Headline */}
          <motion.h1 
            variants={fadeUp}
            className="text-6xl md:text-8xl lg:text-[7.5rem] font-bold text-white leading-[0.95] tracking-[-0.03em] mb-8"
          >
            Afaq: <span className="text-transparent bg-clip-text bg-linear-to-br from-indigo-400 via-purple-400 to-indigo-600 drop-shadow-sm">Horizon</span>
            <br />
            Of Learning.
          </motion.h1>
          
          {/* Subheadline */}
          <motion.p 
            variants={fadeUp}
            className="text-lg md:text-xl text-slate-400 max-w-2xl font-light leading-relaxed mb-12"
          >
            A beautifully engineered platform that transforms passive studying into an interactive, immersive, and highly personalized journey.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-5">
            <button className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-full font-semibold text-base transition-all hover:scale-105 active:scale-95 z-10">
              <span className="absolute inset-0 rounded-full bg-white blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
              Start Exploring
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/3 border border-white/8 text-white rounded-full font-medium transition-all hover:bg-white/8 backdrop-blur-md active:scale-95">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Play className="w-4 h-4 fill-white shrink-0 ml-0.5" />
              </span>
              Watch Demo
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Glass UI Cards */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 1, ease: "easeOut" }}
        className="absolute left-8 lg:left-16 top-[30%] hidden xl:block pointer-events-none z-20"
      >
        <div className="bg-white/2 border border-white/5 backdrop-blur-xl p-5 rounded-3xl shadow-2xl flex items-center gap-5 animate-float">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(99,102,241,0.2)]">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="pr-4">
            <div className="text-3xl font-bold text-white tracking-tight mb-0.5">50k+</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Active Students</div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
        className="absolute right-8 lg:right-16 bottom-[30%] hidden xl:block pointer-events-none z-20"
      >
        <div className="bg-white/2 border border-white/5 backdrop-blur-xl p-5 rounded-3xl shadow-2xl flex items-center gap-5 animate-float" style={{ animationDelay: '1s' }}>
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]">
            <TrendingUp className="w-6 h-6 text-purple-400" />
          </div>
          <div className="pr-4">
            <div className="text-3xl font-bold text-white tracking-tight mb-0.5">4.9/5</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">User Rating</div>
          </div>
        </div>
      </motion.div>

      {/* Bottom fade for smooth section transition */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-[#020617] to-transparent pointer-events-none z-10" />
    </section>
  );
}
