"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowUpRight, GraduationCap, Orbit, Sparkles, Target, Trophy } from "lucide-react";

const stats = [
  { label: "Graduated Students", value: "15,000+", icon: GraduationCap },
  { label: "Course Modules", value: "1,200+", icon: Target },
  { label: "Expert Mentors", value: "250+", icon: Trophy },
  { label: "Innovation Awards", value: "12", icon: Sparkles },
];

export function AboutUs() {
  return (
    <section id="about" className="relative overflow-hidden bg-[#f7f8fb] py-28 text-slate-900 md:py-32">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="space-y-9"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 shadow-sm">
            <Orbit className="h-4 w-4 text-cyan-600" />
            About Afaq
          </div>

          <h3 className="max-w-2xl text-5xl font-black leading-[0.96] tracking-[-0.04em] text-slate-900 md:text-6xl">
            Built Like a
            <span className="block bg-gradient-to-r from-cyan-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              Future-Ready Studio.
            </span>
          </h3>

          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Afaq blends immersive simulation, mentorship, and product-level learning design. Every course is engineered
            to help students move from theory to confident execution in real-world environments.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.4)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_22px_44px_-22px_rgba(79,70,229,0.35)]"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black tracking-tight text-slate-900">{stat.value}</p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <button className="group inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-indigo-600">
            Explore Our Story
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="grid gap-4 sm:grid-cols-2 sm:grid-rows-[1.1fr_0.9fr] lg:mt-4"
        >
          <div className="relative min-h-[380px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.45)] sm:col-span-2">
            <Image
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600"
              alt="Afaq Team"
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 48vw"
              quality={76}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-slate-900/5 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/35 bg-white/80 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Creative Operations</p>
              <p className="mt-1 text-lg font-black tracking-tight text-slate-900">Designing high-impact learning systems</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.5)]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-700">Method</p>
            <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">Research x Experience</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Every module is tested with practical scenarios before release.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.7)]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Vision</p>
            <p className="mt-3 text-2xl font-black tracking-tight">Learning that ships outcomes.</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              We build confidence, speed, and depth for modern digital careers.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
