"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Star, Users } from "lucide-react";
import { Book3D } from "./Book3D";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden flex items-center bg-slate-950">
      {/* Immersive 3D Background */}
      <div className="absolute inset-0 z-0 opacity-60">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 15], fov: 45 }}>
          <Suspense fallback={null}>
            <Book3D />
          </Suspense>
        </Canvas>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pointer-events-none">
        <div className="max-w-3xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { 
                  staggerChildren: 0.2,
                  delayChildren: 0.3 
                } 
              }
            }}
            className="pointer-events-auto"
          >
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
              }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-8"
            >
              <Star className="w-3 h-3 fill-indigo-400" />
              Empowering Future Generations
            </motion.div>
            
            <motion.h1 
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="text-6xl md:text-8xl font-extrabold text-white leading-[1.05] mb-8 tracking-tighter"
            >
              Afaq: The <br />
              <motion.span 
                animate={{ 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ 
                  duration: 5, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="text-gradient bg-size-[200%_auto]"
              >
                Horizon
              </motion.span> Of <br />
              Learning.
            </motion.h1>
            
            <motion.p 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
              }}
              className="text-xl text-slate-400 max-w-xl mb-12 leading-relaxed"
            >
              Step into an immersive educational experience. We've redesigned learning from the ground up to be interactive, digital, and limitless.
            </motion.p>

            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 1, delay: 0.8 } }
              }}
              className="flex flex-wrap gap-6"
            >
              <button className="px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold flex items-center gap-3 group hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all transform hover:-translate-y-1">
                Start Exploring
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-10 py-5 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all backdrop-blur-sm">
                Watch Demo
              </button>
            </motion.div>

            <div className="mt-16 flex items-center gap-10">
               <div className="flex flex-col gap-1">
                  <span className="text-3xl font-bold text-white">50k+</span>
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Active Students</span>
               </div>
               <div className="h-10 w-px bg-white/10" />
               <div className="flex flex-col gap-1">
                  <span className="text-3xl font-bold text-white">4.9/5</span>
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">User Rating</span>
               </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Ambient Floating Elements (Static HTML overlays) */}
      <div className="absolute bottom-12 right-12 z-20 hidden lg:block pointer-events-none">
        <div className="glass p-6 rounded-3xl animate-float max-w-[280px]">
          <div className="flex items-start gap-4">
             <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
                <p className="text-sm font-bold text-white mb-1">New Curriculum</p>
                <p className="text-xs text-slate-400 leading-normal">AI-powered personalized learning paths now available.</p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
