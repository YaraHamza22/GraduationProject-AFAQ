"use client";

import { motion } from "framer-motion";
import { Box, ShieldCheck, Zap, Globe, Cpu, Layers } from "lucide-react";

const pillars = [
  {
    title: "Immersive 3D Learning",
    description: "Step inside your curriculum with state-of-the-art volumetric simulations and interactive 3D environments.",
    icon: Box,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Expert Mentorship",
    description: "Connect with world-class industry leaders who provide personalized guidance and real-world insights.",
    icon: ShieldCheck,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    title: "Global Certification",
    description: "Earn industrial-grade certificates recognized by top companies and academic institutions worldwide.",
    icon: Globe,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "High-Performance Edge",
    description: "Our platform is optimized for speed and reliability, ensuring a seamless experience on any device.",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "AI-Powered Insights",
    description: "Get personalized learning paths and detailed progress analytics powered by advanced AI models.",
    icon: Cpu,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Modular Architecture",
    description: "Learn at your own pace with bite-sized, stackable modules designed for modern professional busy schedules.",
    icon: Layers,
    color: "text-rose-600",
    bg: "bg-rose-50",
  }
];

export function Features() {
  return (
    <section className="relative py-32 bg-linear-to-b from-slate-50 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-xs mb-4 block"
          >
            The Afaq Edge
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight"
          >
            Core Pillars of <span className="text-indigo-600">Excellence</span>.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-lg font-medium"
          >
            We don't just teach—we transform. Discover the features that make our platform the horizon of modern education.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {pillars.map((pillar, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group p-10 rounded-4xl bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300"
            >
              <div className={`w-16 h-16 ${pillar.bg} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                <pillar.icon className={`w-8 h-8 ${pillar.color}`} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors">
                {pillar.title}
              </h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
