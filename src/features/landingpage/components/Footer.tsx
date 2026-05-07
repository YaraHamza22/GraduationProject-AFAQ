"use client";

import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone, Github, ShieldCheck, GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-slate-950 border-t border-white/5 pt-24 pb-12 overflow-hidden">
      {/* Footer Ambient Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">

          {/* Brand Column */}
            <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.jpeg"
                alt="Afaq Logo"
                width={48}
                height={48}
                sizes="48px"
                quality={75}
                className="w-12 h-12 rounded-xl object-cover shadow-2xl"
              />
              <span className="text-2xl font-black text-white tracking-tighter">
                Afaq<span className="text-indigo-500">.</span>
              </span>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed">
              Redefining the horizon of knowledge through immersive digital experiences and world-class certification.
            </p>
            <div className="flex items-center gap-4">
              {[Twitter, Facebook, Instagram, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all active:scale-90"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="space-y-8">
            <h4 className="text-white font-bold text-lg uppercase tracking-wider">The Platform</h4>
            <ul className="space-y-4">
              {["Explore Courses", "Immersive 3D", "Certifications", "Success Stories", "Industrial Partners"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-slate-500 hover:text-indigo-400 font-medium transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-indigo-500 mr-0 group-hover:mr-2 transition-all" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="space-y-8">
            <h4 className="text-white font-bold text-lg uppercase tracking-wider">Company</h4>
            <ul className="space-y-4">
              {["About Afaq", "Mission & Vision", "Our Mentors", "Careers", "Press Kit"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-slate-500 hover:text-indigo-400 font-medium transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-indigo-500 mr-0 group-hover:mr-2 transition-all" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-8">
            <h4 className="text-white font-bold text-lg uppercase tracking-wider">Connect With Us</h4>
            <div className="space-y-6">
              {[
                { icon: MapPin, text: "Syria , Damascus" },
                { icon: Phone, text: "+963 999 999 999" },
                { icon: Mail, text: "hello@afaq.edu" }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-slate-400 font-medium leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <button className="w-full py-4 rounded-2xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
                Apply for Admission
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-slate-600 text-sm font-medium">
            © {currentYear} Afaq Platform. All Rights Reserved. Built for the future of learning.
          </p>
          <div className="flex items-center gap-10">
            <Link href="/instructor/login" className="text-sky-400 hover:text-sky-300 text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 group">
              <GraduationCap className="w-3 h-3" />
              Instructor Portal
              <span className="w-0 group-hover:w-4 h-0.5 bg-sky-400 transition-all duration-300" />
            </Link>
            <Link href="/admin/login" className="text-indigo-400 hover:text-indigo-300 text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 group">
              <ShieldCheck className="w-3 h-3" />
              Admin Portal
              <span className="w-0 group-hover:w-4 h-0.5 bg-indigo-500 transition-all duration-300" />
            </Link>
            <a href="#" className="text-slate-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Terms of Service</a>
            <a href="#" className="text-slate-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
