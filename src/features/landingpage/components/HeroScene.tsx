"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const Book3D = dynamic(() => import("./Book3D").then((mod) => mod.Book3D), {
  ssr: false,
  loading: () => null,
});

export function HeroScene() {
  return (
    <div
      className="absolute inset-0 z-0 opacity-50 mix-blend-lighten pointer-events-none"
      style={{
        WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
      }}
    >
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0, 15], fov: 45 }}>
        <Suspense fallback={null}>
          <Book3D />
        </Suspense>
      </Canvas>
    </div>
  );
}
