"use client";

import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Play, Sparkles, TrendingUp, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

const HeroScene = dynamic(() => import("./HeroScene").then((mod) => mod.HeroScene), {
  ssr: false,
  loading: () => null,
});
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
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hasIdleCallback =
      typeof window !== "undefined" &&
      typeof (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback === "function";

    const idleHandle = hasIdleCallback
      ? (
          window as Window & {
            requestIdleCallback: (cb: () => void) => number;
          }
        ).requestIdleCallback(() => {
          if (!cancelled) setShowScene(true);
        })
      : window.setTimeout(() => {
          if (!cancelled) setShowScene(true);
        }, 180);

    return () => {
      cancelled = true;
      if (hasIdleCallback) {
        (
          window as Window & {
            cancelIdleCallback: (id: number) => void;
          }
        ).cancelIdleCallback(idleHandle as number);
      } else {
        window.clearTimeout(idleHandle);
      }
    };
  }, []);

  return (
    <section id="home" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] selection:bg-indigo-500/30">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" />
      <div className="absolute bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />

      {/* Immersive 3D Background (deferred for faster first paint) */}
      {showScene ? <HeroScene /> : null}

      {/* Content Layer */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col items-center justify-center px-4 pb-20 pt-28 text-center sm:px-6 sm:pt-32 md:pb-24 lg:pt-36">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex max-w-5xl flex-col items-center"
        >
          {/* Eyebrow Badge */}
          <motion.div variants={fadeUp} className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/3 px-3.5 py-2 backdrop-blur-md transition-colors hover:bg-white/6">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-medium tracking-wide text-slate-300 sm:text-sm">The Future of Digital Education</span>
            </div>
          </motion.div>
          
          {/* Main Headline */}
          <motion.h1 
            variants={fadeUp}
            className="mb-6 text-[2.95rem] font-bold leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl md:mb-8 md:text-7xl lg:text-[7.5rem]"
          >
            Afaq: <span className="text-transparent bg-clip-text bg-linear-to-br from-indigo-400 via-purple-400 to-indigo-600 drop-shadow-sm">Horizon</span>
            <br />
            Of Learning.
          </motion.h1>
          
          {/* Subheadline */}
          <motion.p 
            variants={fadeUp}
            className="mb-10 max-w-2xl px-1 text-base font-light leading-7 text-slate-400 sm:text-lg md:mb-12 md:text-xl md:leading-relaxed"
          >
            A beautifully engineered platform that transforms passive studying into an interactive, immersive, and highly personalized journey.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:gap-5">
            <Link
              href="/login"
              className="group relative z-10 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-base font-semibold text-slate-950 transition-all hover:scale-[1.02] active:scale-95 sm:w-auto sm:px-8"
            >
              <span className="absolute inset-0 rounded-full bg-white opacity-20 blur-md transition-opacity group-hover:opacity-40" />
              Start Exploring
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <button className="group inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/8 bg-white/3 px-6 py-4 font-medium text-white backdrop-blur-md transition-all hover:bg-white/8 active:scale-95 sm:w-auto sm:px-8">
              <span className="ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-white/20">
                <Play className="h-4 w-4 fill-white" />
              </span>
              Watch Demo
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:text-center"
          >
            {[
              { label: "Active Students", value: "50k+" },
              { label: "User Rating", value: "4.9/5" },
              { label: "Live Programs", value: "120+" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-4 backdrop-blur-lg"
              >
                <p className="text-2xl font-black tracking-tight text-white">{item.value}</p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Glass UI Cards */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 1, ease: "easeOut" }}
        className="pointer-events-none absolute left-8 top-[30%] z-20 hidden xl:block lg:left-16"
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
        className="pointer-events-none absolute bottom-[30%] right-8 z-20 hidden xl:block lg:right-16"
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
