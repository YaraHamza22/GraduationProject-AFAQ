import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { AboutUs } from "./components/AboutUs";
import { SectionDivider } from "./components/SectionDivider";
import dynamic from "next/dynamic";

const CourseGrid = dynamic(() => import("./components/CourseGrid").then((mod) => mod.CourseGrid));
const Features = dynamic(() => import("./components/Features").then((mod) => mod.Features));
const Testimonials = dynamic(() => import("./components/Testimonials").then((mod) => mod.Testimonials));
const FAQ = dynamic(() => import("./components/FAQ").then((mod) => mod.FAQ));
const Footer = dynamic(() => import("./components/Footer").then((mod) => mod.Footer));

export function LandingPage() {
  return (
    <main className="relative bg-[#020617] min-h-screen text-white">
      <Navbar />
      <Hero />
      
      {/* 1. Dark -> Light (About Us) */}
      <SectionDivider color="#020617" />
      <div className="bg-white">
        <AboutUs />
      </div>
      
      {/* 2. Light -> Dark (Course Grid) */}
      <SectionDivider color="#f1f5f9" inverted />
      <CourseGrid />
      
      {/* 3. Dark -> Light (Features) */}
      <SectionDivider color="#020617" />
      <div className="bg-white">
        <Features />
      </div>
      
      {/* 4. Light -> Dark (Testimonials) */}
      <SectionDivider color="white" inverted />
      <Testimonials />
      
      {/* 5. Dark -> Light (FAQ) */}
      <SectionDivider color="#020617" />
      <div className="bg-white">
        <FAQ />
      </div>
      
      {/* 6. Light -> Dark (Footer) */}
      <SectionDivider color="#f1f5f9" inverted />
      <Footer />
    </main>
  );
}
