"use client";

import { motion } from "framer-motion";
import { Box, ShieldCheck, Zap, Globe, Cpu, Layers } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { landingContent } from "../content";

const pillarIcons = [Box, ShieldCheck, Globe, Zap, Cpu, Layers];

export function Features() {
  const { language, isRTL } = useLanguage();
  const copy = landingContent[language].features;

  return (
    <section id="programs" className="relative overflow-hidden bg-linear-to-b from-slate-50 to-white py-24 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={`mx-auto mb-16 max-w-3xl text-center sm:mb-20 lg:mb-24 ${isRTL ? "text-right sm:text-center" : ""}`}>
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-xs mb-4 block"
          >
            {copy.badge}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-6 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl"
          >
            {copy.title} <span className="text-indigo-600">{copy.titleHighlight}</span>.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base font-medium text-slate-500 sm:text-lg"
          >
            {copy.description}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {copy.items.map((pillar, i) => {
            const Icon = pillarIcons[i];
            return (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-[2rem] border border-slate-100 bg-white p-6 transition-all duration-300 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/5 sm:p-8 lg:p-10"
            >
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${pillar.bg} transition-transform duration-500 group-hover:scale-110 sm:mb-8 sm:h-16 sm:w-16`}>
                {Icon ? <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${pillar.color}`} /> : null}
              </div>
              <h3 className={`mb-3 text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600 sm:mb-4 sm:text-xl ${isRTL ? "text-right" : ""}`}>
                {pillar.title}
              </h3>
              <p className={`font-medium leading-7 text-slate-500 ${isRTL ? "text-right" : ""}`}>{pillar.description}</p>
            </motion.div>
          )})}
        </div>
      </div>
    </section>
  );
}
