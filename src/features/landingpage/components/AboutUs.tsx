"use client";

import { motion } from "framer-motion";
import { GraduationCap, Sparkles, Target, Trophy } from "lucide-react";

export function AboutUs() {
  const stats = [
    { label: "Graduated Students", value: "15,000+", icon: GraduationCap },
    { label: "Course Modules", value: "1,200+", icon: Target },
    { label: "Expert Mentors", value: "250+", icon: Trophy },
    { label: "Innovation Awards", value: "12", icon: Sparkles },
  ];

  return (
    <section id="about" className="relative py-32 bg-linear-to-b from-white to-slate-100 overflow-hidden">
      {/* Decorative light ambient orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Visual Side with premium frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative z-10 rounded-[3rem] overflow-hidden border border-slate-200 group shadow-2xl shadow-slate-200">
              <div className="absolute inset-0 bg-linear-to-tr from-indigo-500/20 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-10 transition-opacity duration-700" />
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200" 
                alt="Our Team" 
                className="w-full aspect-4/5 object-cover group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute bottom-8 left-8 right-8 z-20">
                 <div className="bg-white/70 backdrop-blur-2xl p-6 rounded-3xl border border-white/50 transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-xl">
                    <p className="text-slate-900 font-bold text-lg tracking-tight">Our Mission Control</p>
                    <p className="text-slate-600 text-sm mt-1">Innovation starts with a shared vision.</p>
                 </div>
              </div>
            </div>
            
            {/* Abstract Decorative elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-200/50 blur-3xl rounded-full" />
            <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-purple-100/50 blur-3xl rounded-full" />
          </motion.div>

          {/* Text Content with refined typography */}
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-6">
                Redefining the Horizon
              </span>
              <h3 className="text-5xl md:text-6xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tight">
                Where Vision Meets <span className="text-indigo-600">Real-World</span> Results.
              </h3>
              <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium">
                Afaq is more than a platform—it's a digital ecosystem engineered for the next generation of pioneers. Our infrastructure combines massive 3D simulations with peerless educational content.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-2 gap-x-12 gap-y-10 border-t border-slate-200 pt-10"
            >
              {stats.map((stat, i) => (
                <div key={i} className="group cursor-default">
                   <div className="flex items-center gap-4 mb-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all duration-300">
                        <stat.icon className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{stat.value}</span>
                   </div>
                   <span className="text-[11px] text-slate-500 uppercase tracking-[0.2em] font-bold block ml-14">{stat.label}</span>
                </div>
              ))}
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all flex items-center gap-3 active:scale-95"
            >
              Learn Our Philosophy
              <Sparkles className="w-4 h-4 text-white" />
            </motion.button>
          </div>

        </div>
      </div>
    </section>
  );
}
