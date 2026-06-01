"use client";

import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone, Github, ShieldCheck, GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { landingContent } from "../content";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { language, isRTL } = useLanguage();
  const copy = landingContent[language].footer;

  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-slate-950 pb-12 pt-24">
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-full -translate-x-1/2 rounded-full bg-indigo-600/5 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className={`mb-20 grid grid-cols-1 gap-16 md:grid-cols-2 lg:grid-cols-4 ${isRTL ? "text-right" : ""}`}>
          <div className="space-y-8">
            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Image
                src="/logo.jpeg"
                alt="Afaq Logo"
                width={48}
                height={48}
                sizes="48px"
                quality={75}
                className="h-12 w-12 rounded-xl object-cover shadow-2xl"
              />
              <span className="text-2xl font-black tracking-tighter text-white">
                Afaq<span className="text-indigo-500">.</span>
              </span>
            </div>
            <p className="text-lg leading-relaxed text-slate-400">{copy.description}</p>
            <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              {[Twitter, Facebook, Instagram, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-400 transition-all hover:bg-indigo-600 hover:text-white active:scale-90"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <h4 className="text-lg font-bold uppercase tracking-wider text-white">{copy.platformTitle}</h4>
            <ul className="space-y-4">
              {copy.platformLinks.map((link) => (
                <li key={link}>
                  <a href="#" className={`group inline-flex items-center font-medium text-slate-500 transition-colors hover:text-indigo-400 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className={`h-0.5 w-0 bg-indigo-500 transition-all ${isRTL ? "ml-0 group-hover:ml-2 group-hover:w-2" : "mr-0 group-hover:mr-2 group-hover:w-2"}`} />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-8">
            <h4 className="text-lg font-bold uppercase tracking-wider text-white">{copy.companyTitle}</h4>
            <ul className="space-y-4">
              {copy.companyLinks.map((link) => (
                <li key={link}>
                  <a href="#" className={`group inline-flex items-center font-medium text-slate-500 transition-colors hover:text-indigo-400 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className={`h-0.5 w-0 bg-indigo-500 transition-all ${isRTL ? "ml-0 group-hover:ml-2 group-hover:w-2" : "mr-0 group-hover:mr-2 group-hover:w-2"}`} />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-8">
            <h4 className="text-lg font-bold uppercase tracking-wider text-white">{copy.contactTitle}</h4>
            <div className="space-y-6">
              {[
                { icon: MapPin, text: copy.contactItems[0] },
                { icon: Phone, text: copy.contactItems[1] },
                { icon: Mail, text: copy.contactItems[2] },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium leading-relaxed text-slate-400">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <button className="w-full rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-95">
                {copy.apply}
              </button>
            </div>
          </div>
        </div>

        <div className={`flex flex-col items-center justify-between gap-8 border-t border-white/5 pt-12 md:flex-row ${isRTL ? "md:flex-row-reverse" : ""}`}>
          <p className="text-sm font-medium text-slate-600">
            © {currentYear} Afaq Platform. {copy.copyright}
          </p>
          <div className={`flex items-center gap-10 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Link href="/instructor/login" className={`group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-400 transition-colors hover:text-sky-300 ${isRTL ? "flex-row-reverse" : ""}`}>
              <GraduationCap className="h-3 w-3" />
              {copy.instructorPortal}
              <span className="h-0.5 w-0 bg-sky-400 transition-all duration-300 group-hover:w-4" />
            </Link>
            <Link href="/admin/login" className={`group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 transition-colors hover:text-indigo-300 ${isRTL ? "flex-row-reverse" : ""}`}>
              <ShieldCheck className="h-3 w-3" />
              {copy.adminPortal}
              <span className="h-0.5 w-0 bg-indigo-500 transition-all duration-300 group-hover:w-4" />
            </Link>
            <a href="#" className="text-xs font-bold uppercase tracking-widest text-slate-600 transition-colors hover:text-white">{copy.privacy}</a>
            <a href="#" className="text-xs font-bold uppercase tracking-widest text-slate-600 transition-colors hover:text-white">{copy.terms}</a>
            <a href="#" className="text-xs font-bold uppercase tracking-widest text-slate-600 transition-colors hover:text-white">{copy.cookies}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
