"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, User, X, ArrowUpRight } from "lucide-react";

import logoImage from "../../../../public/logo.jpeg";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrolledRef = useRef(false);
  const navItems = [
    { label: "Home", href: "#home" },
    { label: "Courses", href: "#courses" },
    { label: "Programs", href: "#programs" },
    { label: "About", href: "#about" },
  ];

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const nextScrolled = window.scrollY > 20;
          if (nextScrolled !== scrolledRef.current) {
            scrolledRef.current = nextScrolled;
            setScrolled(nextScrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 px-3 py-3 sm:px-5 sm:py-4"
      >
        <div className={`mx-auto flex w-full max-w-7xl items-center justify-between rounded-[1.4rem] px-4 py-3 sm:px-5 lg:px-6 ${scrolled
          ? "border border-white/10 bg-slate-950/85 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl"
          : "border border-white/10 bg-white/5 backdrop-blur-md"
          } transition-all duration-500`}>
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/20 shadow-lg transition-transform group-hover:scale-110 sm:h-11 sm:w-11">
            <Image
              src={logoImage}
              alt="Afaq Logo"
              fill
              priority
              loading="eager"
              sizes="40px"
              quality={70}
              className="object-cover"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-white transition-colors duration-300 sm:text-2xl">
            Afaq<span className="text-indigo-500">.</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-white/70 hover:text-white transition-colors relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-linear-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button className="hidden p-2 text-white/70 transition-colors hover:text-white sm:inline-flex">
            <Search className="w-5 h-5" />
          </button>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-3 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95 sm:px-5"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Login</span>
            <span className="sm:hidden">Log in</span>
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsMenuOpen(true)}
            className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/80 transition-colors hover:text-white md:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
      </motion.nav>

      <AnimatePresence>
        {isMenuOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-950/72 backdrop-blur-md md:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed right-0 top-0 z-[70] flex h-screen w-[min(88vw,24rem)] flex-col border-l border-white/10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_30%),linear-gradient(180deg,#020617,#0f172a)] p-5 text-white shadow-[-20px_0_60px_rgba(2,6,23,0.55)] md:hidden"
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/20">
                    <Image src={logoImage} alt="Afaq Logo" fill sizes="44px" className="object-cover" />
                  </div>
                  <div>
                    <p className="text-lg font-black tracking-tight">Afaq.</p>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Navigation</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/75"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-8 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300">Explore Faster</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Jump through the landing page with a mobile-first menu built for quick scanning.
                </p>
              </div>

              <nav className="flex flex-1 flex-col gap-2">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={{ delay: 0.04 * index }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-4 text-base font-semibold text-slate-100 transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:text-indigo-300" />
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="mt-8 space-y-3">
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white"
                >
                  <User className="h-4 w-4" />
                  Login
                </Link>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-slate-200"
                >
                  <Search className="h-4 w-4" />
                  Search Courses
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
