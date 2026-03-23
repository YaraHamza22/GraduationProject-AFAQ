"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Stars, PerspectiveCamera, MeshTransmissionMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";

function FloatingPage({ position, rotation, scale, color }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Custom tiny rotation on individual pages
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        <boxGeometry args={[1, 1.4, 0.05]} />
        <meshPhysicalMaterial 
          color={color}
          metalness={0.2}
          roughness={0.1}
          transmission={0.9} // Glass-like transmission built in
          thickness={0.5} 
          ior={1.4}
          envMapIntensity={1}
          clearcoat={1}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
        {/* Glowing Edge outline */}
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1, 1.4, 0.05)]} />
          <lineBasicMaterial attach="material" color={color} transparent opacity={0.3} />
        </lineSegments>
      </mesh>
    </Float>
  );
}

function OrbitalHorizons() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.15) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer Horizon */}
      <mesh rotation={[Math.PI / 2 + 0.2, 0, 0]}>
        <torusGeometry args={[8.5, 0.008, 16, 100]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.4} />
      </mesh>
      
      {/* Middle Horizon - Rotating faster */}
      <mesh rotation={[Math.PI / 3 - 0.4, 0.2, 0]}>
         <torusGeometry args={[5.5, 0.012, 16, 100]} />
         <meshBasicMaterial color="#a855f7" transparent opacity={0.5} />
      </mesh>

      {/* Inner Horizon */}
      <mesh rotation={[Math.PI / 4, -0.3, 0.1]}>
         <torusGeometry args={[3.2, 0.015, 16, 100]} />
         <meshBasicMaterial color="#ec4899" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function Book3D() {
  const codexRef = useRef<THREE.Group>(null);
  
  // Generate floating fragmented "pages" simulating digital knowledge scattered around the core
  const pages = useMemo(() => {
    return [...Array(32)].map((_, i) => {
      // Golden spiral distribution roughly
      const y = 1 - (i / 31) * 2; // from 1 to -1
      const radius = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (1 + Math.sqrt(5)); // Golden angle padding
      
      const r = 4 + Math.random() * 4; // Distance from center
      const posX = Math.cos(theta) * radius * r;
      const posY = y * (r * 0.6); // slight squash
      const posZ = Math.sin(theta) * radius * r;
      
      return {
        position: [posX, posY, posZ] as [number, number, number],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ] as [number, number, number],
        scale: Math.random() * 0.4 + 0.4,
        color: i % 4 === 0 ? "#6366f1" : i % 4 === 1 ? "#a855f7" : i % 4 === 2 ? "#ec4899" : "#e2e8f0"
      };
    });
  }, []);

  useFrame((state) => {
    if (codexRef.current) {
      codexRef.current.rotation.y = state.clock.getElapsedTime() * 0.03;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.5, 18]} fov={45} />
      
      {/* Dynamic Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={4} color="#ffffff" distance={15} />
      <spotLight position={[10, 20, 10]} intensity={3} color="#6366f1" penumbra={1} distance={40} angle={Math.PI / 3} />
      <spotLight position={[-10, -20, -10]} intensity={3} color="#a855f7" penumbra={1} distance={40} angle={Math.PI / 3} />
      
      {/* Deep Space Background / Constellations of Information */}
      <Stars radius={80} depth={50} count={6000} factor={4} saturation={1} fade speed={1} />

      <group ref={codexRef}>
        {/* Core Element: The Nucleus of Knowledge */}
        <Float speed={3} rotationIntensity={2} floatIntensity={0.5}>
          {/* Outer high-fidelity refractive shell */}
          <Sphere args={[1.6, 64, 64]}>
            <MeshTransmissionMaterial 
              samples={4} // keep low for performance while maintaining premium look
              resolution={256}
              transmission={0.95}
              roughness={0.1}
              thickness={1.5}
              ior={1.4}
              chromaticAberration={0.4}
              anisotropy={0.3}
              color="#e0e7ff"
            />
          </Sphere>
          {/* Inner Glowing AI Core */}
          <Sphere args={[0.7, 32, 32]}>
            <meshBasicMaterial color="#ffffff" />
          </Sphere>
        </Float>

        {/* The Digital Pages/Fragments Orbiting */}
        {pages.map((item, i) => (
           <FloatingPage 
             key={i} 
             position={item.position} 
             rotation={item.rotation} 
             scale={item.scale}
             color={item.color}
           />
        ))}

        {/* The Concentric Rings of "Horizons" */}
        <OrbitalHorizons />
      </group>

      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 10, 35]} />
    </>
  );
}
