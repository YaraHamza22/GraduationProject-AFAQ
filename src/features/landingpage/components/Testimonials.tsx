"use client";

import { motion } from "framer-motion";
import { Star, CheckCircle2, Quote } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { landingContent } from "../content";

export function Testimonials() {
  const { language, isRTL } = useLanguage();
  const copy = landingContent[language].testimonials;

  return (
    <section className="relative py-32 bg-slate-950 overflow-hidden">
      {/* Decorative gradient orbs for depth */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className={`max-w-7xl mx-auto px-6 relative z-10 text-center mb-24 ${isRTL ? "text-right sm:text-center" : ""}`}>
        <motion.span 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-xs mb-4 block"
        >
          {copy.badge}
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-white"
        >
          {copy.title} <span className="text-gradient">{copy.titleHighlight}</span>.
        </motion.h2>
      </div>

      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
          {copy.items.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative p-10 rounded-4xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden group"
            >
              <Quote className={`absolute top-8 w-12 h-12 text-white/5 group-hover:text-indigo-500/10 transition-colors duration-500 ${isRTL ? "left-8" : "right-8"}`} />
              
              <div className="flex gap-1 mb-8">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 text-amber-400 fill-current" />
                ))}
              </div>

              <p className={`text-slate-300 text-lg md:text-xl font-medium leading-relaxed mb-10 italic ${isRTL ? "text-right" : ""}`}>
                &ldquo;{item.text}&rdquo;
              </p>

                <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                  <div className="relative">
                  <Image
                    src={item.avatar}
                    width={56}
                    height={56}
                    loading="lazy"
                    sizes="56px"
                    quality={65}
                    className="w-14 h-14 rounded-full border-2 border-indigo-500/30"
                    alt={item.name}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-indigo-500 border-2 border-slate-950 rounded-full p-0.5">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className={isRTL ? "text-right" : ""}>
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
