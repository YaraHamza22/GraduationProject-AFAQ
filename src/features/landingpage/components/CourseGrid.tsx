"use client";

import { motion } from "framer-motion";
import { Clock, Star, Users, ArrowUpRight } from "lucide-react";

const courses = [
  {
    title: "Advanced 3D Architecture",
    instructor: "Eng. Sarah Ahmed",
    avatar: "https://i.pravatar.cc/150?u=sarah",
    duration: "12 Weeks",
    rating: 4.9,
    students: "1.2k",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800",
    color: "from-blue-500 to-cyan-400",
  },
  {
    title: "AI & Neural Networks",
    instructor: "Dr. Ryan Khalid",
    avatar: "https://i.pravatar.cc/150?u=ryan",
    duration: "10 Weeks",
    rating: 4.8,
    students: "850",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800",
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Digital Business Vision",
    instructor: "Layla Mansour",
    avatar: "https://i.pravatar.cc/150?u=layla",
    duration: "8 Weeks",
    rating: 4.7,
    students: "2.1k",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800",
    color: "from-amber-400 to-orange-500",
  }
];

export function CourseGrid() {
  return (
    <section className="relative py-32 bg-slate-950 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
          <div className="max-w-xl">
             <motion.span 
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-xs mb-4 block"
             >
               Explore Knowledge
             </motion.span>
             <motion.h2 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.1 }}
               className="text-4xl md:text-5xl font-black text-white leading-tight"
             >
               Find Your Path in the <span className="text-gradient">Afaq</span> Ecosystem.
             </motion.h2>
          </div>
          <motion.button 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-semibold flex items-center gap-2 group"
          >
            Browse All Courses
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative"
            >
              {/* Card Hover Glow */}
              <div className={`absolute -inset-0.5 bg-linear-to-r ${course.color} rounded-4xl blur opacity-0 group-hover:opacity-20 transition duration-500`} />
              
              <div className="relative h-full bg-slate-900 border border-white/5 rounded-4xl overflow-hidden flex flex-col hover:border-white/10 transition-colors">
                {/* Image Section */}
                <div className="relative h-56 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-white text-xs font-bold">{course.duration}</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-8 flex flex-col grow">
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-bold ml-1">{course.rating}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {course.title}
                  </h3>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={course.avatar} className="w-8 h-8 rounded-full border border-white/20" alt={course.instructor} />
                      <span className="text-sm text-slate-400 font-medium">{course.instructor}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">{course.students}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
