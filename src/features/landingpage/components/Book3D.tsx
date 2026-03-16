"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Sphere, Stars, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

function AmbientBlob({ position, color, scale, speed, distort }: { position: [number, number, number], color: string, scale: number, speed: number, distort: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1 * speed;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15 * speed;
    }
  });

  return (
    <Float speed={speed * 2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1, 64, 64]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          speed={speed * 2}
          distort={distort}
          radius={1}
          roughness={0.4}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.8}
        />
      </Sphere>
    </Float>
  );
}

export function Book3D() {
  const orbitalRef = useRef<THREE.Group>(null);
  
  // Create a wider field of orbiting knowledge "bits"
  const knowledgeField = useMemo(() => {
    return [...Array(40)].map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 15
      ] as [number, number, number],
      scale: Math.random() * 0.15 + 0.05,
      speed: Math.random() * 0.3 + 0.1,
      color: i % 3 === 0 ? "#6366f1" : i % 3 === 1 ? "#a855f7" : "#f43f5e"
    }));
  }, []);

  useFrame((state) => {
    if (orbitalRef.current) {
      orbitalRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
      <ambientLight intensity={0.4} />
      <pointLight position={[20, 20, 20]} intensity={2} color="#6366f1" />
      <pointLight position={[-20, -20, -20]} intensity={1.5} color="#a855f7" />
      
      <Stars radius={150} depth={50} count={7000} factor={4} saturation={0.5} fade speed={0.5} />

      {/* Primary Ambient Blobs - distributed across the background */}
      <AmbientBlob position={[8, 4, -5]} color="#312e81" scale={4} speed={0.5} distort={0.4} />
      <AmbientBlob position={[-10, -5, -8]} color="#4c1d95" scale={5} speed={0.3} distort={0.5} />
      <AmbientBlob position={[2, -8, -2]} color="#1e1b4b" scale={3} speed={0.7} distort={0.3} />

      {/* Drifting Knowledge Field */}
      <group ref={orbitalRef}>
        {knowledgeField.map((item, i) => (
          <mesh key={i} position={item.position} scale={item.scale}>
            <boxGeometry args={[1, 1.4, 0.2]} />
            <meshStandardMaterial 
              color={item.color} 
              emissive={item.color}
              emissiveIntensity={1.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>

      {/* Deep atmospheric fog effect */}
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 10, 35]} />
    </>
  );
}
