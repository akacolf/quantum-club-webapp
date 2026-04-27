"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

function QuantumWalletCore() {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.22;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.8) * 0.16;
    const scale = 1 + Math.sin(state.clock.elapsedTime * 1.35) * 0.035;
    group.current.scale.setScalar(scale);
  });

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.55} floatIntensity={0.9}>
        <mesh>
          <icosahedronGeometry args={[0.96, 2]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.22} />
        </mesh>
        <mesh scale={1.28} rotation={[0.34, 0.22, 0.12]}>
          <icosahedronGeometry args={[0.96, 1]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.075} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0.2, 0]}>
          <torusGeometry args={[1.44, 0.01, 12, 128]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.34} />
        </mesh>
        <mesh rotation={[0.68, 0.28, -0.45]}>
          <torusGeometry args={[1.78, 0.008, 12, 128]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.16} />
        </mesh>
        <mesh rotation={[0.2, -0.4, 0.65]}>
          <torusKnotGeometry args={[0.48, 0.035, 140, 12]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.13} />
        </mesh>
      </Float>
    </group>
  );
}

function ConstellationField() {
  const points = useRef<THREE.Points>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(96 * 3);
    for (let i = 0; i < 96; i++) {
      const angle = i * 2.399963;
      const radius = 1.65 + (i % 9) * 0.075;
      values[i * 3] = Math.cos(angle) * radius;
      values[i * 3 + 1] = Math.sin(i * 0.73) * 1.18;
      values[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return values;
  }, []);
  const linePositions = useMemo(() => {
    const values = new Float32Array(72 * 2 * 3);
    for (let i = 0; i < 72; i++) {
      const a = i * 3;
      const b = ((i + 13) % 96) * 3;
      values[i * 6] = positions[a];
      values[i * 6 + 1] = positions[a + 1];
      values[i * 6 + 2] = positions[a + 2];
      values[i * 6 + 3] = positions[b];
      values[i * 6 + 4] = positions[b + 1];
      values[i * 6 + 5] = positions[b + 2];
    }
    return values;
  }, [positions]);

  useFrame((state, delta) => {
    if (!points.current) return;
    points.current.rotation.y -= delta * 0.075;
    points.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.22) * 0.08;
    if (lines.current) {
      lines.current.rotation.copy(points.current.rotation);
    }
  });

  return (
    <>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.034} color="#ffffff" transparent opacity={0.62} sizeAttenuation />
      </points>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.038} />
      </lineSegments>
    </>
  );
}

export default function WalletWelcomeScene() {
  return (
    <div className="relative h-72 w-full overflow-hidden bg-black">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.6]}>
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 3, 14]} />
        <Stars radius={70} depth={38} count={4200} factor={3} saturation={0} fade speed={1.25} />
        <ConstellationField />
        <QuantumWalletCore />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
