"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

// The floating central geometry
const QuantumCore = ({ storyIndex }: { storyIndex: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create an array of random points to connect
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 100; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        )
      );
    }
    return pts;
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.15;
      meshRef.current.rotation.y += delta * 0.2;
      
      // Subtle breathing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        {/* Story 0: An abstract complex geometric core */}
        {storyIndex === 0 ? (
          <icosahedronGeometry args={[0.8, 2]} />
        ) : (
          /* Story 1: A more structured, torus knot core */
          <torusKnotGeometry args={[0.5, 0.15, 128, 32]} />
        )}
        <meshBasicMaterial 
          color="#ffffff" 
          wireframe 
          transparent 
          opacity={0.15} 
        />
      </mesh>
      
      {/* Additional outer shell for depth - only for story 0 */}
      {storyIndex === 0 && (
        <mesh scale={1.2}>
          <icosahedronGeometry args={[0.8, 1]} />
          <meshBasicMaterial 
            color="#ffffff" 
            wireframe 
            transparent 
            opacity={0.05} 
          />
        </mesh>
      )}
    </Float>
  );
};

// The main Canvas container
export default function Scene({ currentStory }: { currentStory: number }) {
  return (
    <div className="absolute inset-0 z-0 bg-black overflow-hidden pointer-events-none">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 3, 15]} />
        
        {/* Infinite starfield background */}
        <Stars 
          radius={100} 
          depth={50} 
          count={5000} 
          factor={3} 
          saturation={0} 
          fade 
          speed={1.5} 
        />
        
        <QuantumCore storyIndex={currentStory} />
      </Canvas>
      
      {/* Subtle bottom vignette to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
    </div>
  );
}
