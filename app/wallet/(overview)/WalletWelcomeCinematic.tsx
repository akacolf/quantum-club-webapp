"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

function WalletObject() {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.28;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.55) * 0.08;
  });

  return (
    <Float speed={1.4} floatIntensity={0.35} rotationIntensity={0.18}>
      <group ref={group}>
        <RoundedBox args={[1.7, 1.18, 0.22]} radius={0.12} smoothness={8}>
          <meshStandardMaterial
            color="#111111"
            metalness={0.48}
            roughness={0.24}
            emissive="#111111"
            emissiveIntensity={0.16}
          />
        </RoundedBox>
        <mesh position={[0.66, 0, 0.15]}>
          <circleGeometry args={[0.2, 48]} />
          <meshStandardMaterial color="#f5f5f5" metalness={0.72} roughness={0.18} />
        </mesh>
        <mesh position={[0.66, 0, 0.2]}>
          <torusGeometry args={[0.33, 0.012, 12, 96]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
        </mesh>
      </group>
    </Float>
  );
}

export default function WalletWelcomeCinematic() {
  return (
    <div className="relative h-64 w-full overflow-hidden bg-black">
      <div className="absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
      <Canvas camera={{ position: [0, 0, 4.8], fov: 38 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 3, 4]} intensity={2.2} />
        <pointLight position={[-2.5, 1.5, 2]} intensity={1.1} />
        <WalletObject />
        <Environment preset="city" />
      </Canvas>
      <div className="absolute inset-x-16 bottom-9 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
