"use client";

import { motion } from "framer-motion";
import { Star, CheckCircle2, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Alex Johnson",
    role: "Senior Developer",
    text: "Afaq has completely changed my approach to distributed systems. The 3D simulations are truly a game-changer in understanding complex architectures.",
    avatar: "https://i.pravatar.cc/150?u=alex",
  },
  {
    name: "Maria Garcia",
    role: "Digital Artist",
    text: "The quality of the instructors is unmatched. Every module on the platform feels like a deep dive into the absolute peak of industrial design.",
    avatar: "https://i.pravatar.cc/150?u=maria",
  },
  {
    name: "Omar Zayed",
    role: "Project Manager",
    text: "I was looking for a platform that could keep up with modern tech trends, and Afaq delivered exactly that. The certification opened new doors for my career.",
    avatar: "https://i.pravatar.cc/150?u=omar",
  },
  {
    name: "Sophia Chen",
    role: "Product Designer",
    text: "The attention to detail and user experience on this platform is a masterclass in modern digital services. Truly worth every minute invested.",
    avatar: "https://i.pravatar.cc/150?u=sophia",
  }
];

export function Testimonials() {
  return (
    <section className="relative py-32 bg-slate-950 overflow-hidden">
      {/* Decorative gradient orbs for depth */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center mb-24">
        <motion.span 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-xs mb-4 block"
        >
          Voices of Success
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-white"
        >
          Community <span className="text-gradient">Endorsements</span>.
        </motion.h2>
      </div>

      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative p-10 rounded-4xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden group"
            >
              <Quote className="absolute top-8 right-8 w-12 h-12 text-white/5 group-hover:text-indigo-500/10 transition-colors duration-500" />
              
              <div className="flex gap-1 mb-8">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 text-amber-400 fill-current" />
                ))}
              </div>

              <p className="text-slate-300 text-lg md:text-xl font-medium leading-relaxed mb-10 italic">
                "{item.text}"
              </p>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={item.avatar} className="w-14 h-14 rounded-full border-2 border-indigo-500/30" alt={item.name} />
                  <div className="absolute -bottom-1 -right-1 bg-indigo-500 border-2 border-slate-950 rounded-full p-0.5">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">{item.name}</h4>
                  <p className="text-slate-500 text-sm font-semibold">{item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
