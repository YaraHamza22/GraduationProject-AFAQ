"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Do I need any previous technical experience?",
    answer: "Our courses range from beginner to expert. Each program details the necessary prerequisites, ensuring you start exactly where your current knowledge ends.",
  },
  {
    question: "How long is each certification valid?",
    answer: "Afaq certifications are globally recognized and have no expiration date. However, we recommend retaking updated modules every 2 years to stay current with technology shifts.",
  },
  {
    question: "Can I access the 3D simulations on mobile?",
    answer: "Yes! Our engine is optimized for high-performance mobile browsers and tablets, allowing you to learn in the 'Knowledge Universe' from anywhere.",
  },
  {
    question: "Is there mentorship support available?",
    answer: "Absolutely. Depending on your course level, you get 1-on-1 sessions, group workshops, and 24/7 technical support from our lead industrial mentors.",
  }
];

export function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section className="relative py-32 bg-linear-to-b from-white to-slate-50 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/5 rotate-12"
          >
            <HelpCircle className="w-8 h-8 text-indigo-600 -rotate-12" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight"
          >
            Curiosity <span className="text-indigo-600">Clarified</span>.
          </motion.h2>
          <p className="text-slate-500 mt-6 text-lg font-medium">Finding answers to your most frequent explorations.</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-3xl border transition-all duration-300 ${
                activeIndex === i 
                ? "bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-500/30" 
                : "bg-white border-slate-100 hover:border-indigo-200"
              }`}
            >
              <button
                onClick={() => setActiveIndex(activeIndex === i ? null : i)}
                className="w-full px-8 py-8 flex items-center justify-between gap-6 text-left"
              >
                <span className={`text-xl font-bold transition-colors ${
                  activeIndex === i ? "text-white" : "text-slate-900"
                }`}>
                  {faq.question}
                </span>
                <div className={`p-2 rounded-full transition-colors ${
                  activeIndex === i ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400"
                }`}>
                  {activeIndex === i ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
              </button>
              
              <AnimatePresence>
                {activeIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 pb-10">
                      <p className={`text-lg font-medium leading-relaxed ${
                        activeIndex === i ? "text-indigo-50" : "text-slate-500"
                      }`}>
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
