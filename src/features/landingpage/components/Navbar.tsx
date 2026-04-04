"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, Search, User } from "lucide-react";

import logoImage from "../../../../public/logo.jpeg";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className={`max-w-7xl mx-auto flex items-center justify-between rounded-2xl px-6 py-3 transition-all duration-500 ${
        scrolled 
        ? "bg-slate-950/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]" 
        : "bg-white/5 backdrop-blur-md border border-white/10"
      }`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl border border-white/20 transition-transform group-hover:scale-110 shadow-lg">
            <Image 
              src={logoImage} 
              alt="Afaq Logo" 
              fill 
              priority
              loading="eager"
              className="object-cover"
            />
          </div>
          <span className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${
            scrolled ? "text-white" : "text-white"
          }`}>
            Afaq<span className="text-indigo-500">.</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {["Home", "Courses", "Programs", "About"].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="text-white/70 hover:text-white transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-linear-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="p-2 text-white/70 hover:text-white transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <Link 
            href="/login"
            className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all active:scale-95"
          >
            <User className="w-4 h-4" />
            Login
          </Link>
          <button className="md:hidden p-2 text-white/70 hover:text-white transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
