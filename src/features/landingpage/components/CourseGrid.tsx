"use client";

import { motion } from "framer-motion";
import Image from "next/image";
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
    <section id="courses" className="relative overflow-hidden bg-slate-950 py-24 sm:py-28 lg:py-32">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-14 flex flex-col justify-between gap-6 md:mb-20 md:flex-row md:items-end md:gap-8">
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
               className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl"
             >
               Find Your Path in the <span className="text-gradient">Afaq</span> Ecosystem.
             </motion.h2>
          </div>
          <motion.button 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/5 sm:w-auto"
          >
            Browse All Courses
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </motion.button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {courses.map((course, i) => (
            <motion.div
              key={course.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative"
            >
              {/* Card Hover Glow */}
              <div className={`absolute -inset-0.5 bg-linear-to-r ${course.color} rounded-4xl blur opacity-0 group-hover:opacity-20 transition duration-500`} />
              
              <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-slate-900 transition-colors hover:border-white/10 sm:rounded-4xl">
                {/* Image Section */}
                <div className="relative h-52 overflow-hidden sm:h-56">
                  <Image 
                    src={course.image} 
                    alt={course.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={70}
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-white text-xs font-bold">{course.duration}</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex grow flex-col p-5 sm:p-8">
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-bold ml-1">{course.rating}</span>
                  </div>
                  
                  <h3 className="mb-4 line-clamp-2 text-lg font-bold text-white transition-colors group-hover:text-indigo-400 sm:text-xl">
                    {course.title}
                  </h3>

                  <div className="mt-auto flex flex-col gap-4 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
                    <div className="flex items-center gap-3">
                      <Image
                        src={course.avatar}
                        width={32}
                        height={32}
                        loading="lazy"
                        sizes="32px"
                        quality={65}
                        className="w-8 h-8 rounded-full border border-white/20"
                        alt={course.instructor}
                      />
                      <span className="text-sm font-medium text-slate-400">{course.instructor}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 sm:justify-end">
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
