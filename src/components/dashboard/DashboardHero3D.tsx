/**
 * Cinematic hero matching mockup:
 * - PathRibbon (glowing tube curve)
 * - Floating glass orbs
 * - Skill sphere with MeshDistortMaterial + volumetric-ish lights
 * - Percent badge overlay
 * - Reduced-motion CSS fallback
 */
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh } from 'three';

function PathRibbon() {
  const meshRef = useRef<Mesh>(null);
  const curve = useMemo(() => {
    // S-curve from left-center toward the sphere (right)
    const points = [
      new THREE.Vector3(-3.2, -0.15, 0.2),
      new THREE.Vector3(-1.6, 0.35, 0.1),
      new THREE.Vector3(-0.2, 0.55, 0),
      new THREE.Vector3(1.0, 0.25, -0.05),
      new THREE.Vector3(2.0, 0.05, 0),
    ];
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.07, 12, false);
  }, [curve]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      mat.emissiveIntensity = 0.55 + Math.sin(clock.getElapsedTime() * 1.4) * 0.25;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#7c3aed"
        emissive="#a78bfa"
        emissiveIntensity={0.7}
        transparent
        opacity={0.92}
        roughness={0.25}
        metalness={0.4}
      />
    </mesh>
  );
}

function Orbs() {
  const positions = useMemo(
    () =>
      [
        [-2.6, 0.85, -0.4],
        [-1.9, -0.55, 0.3],
        [-0.6, 0.95, -0.6],
        [0.5, -0.7, 0.2],
        [1.5, 0.7, -0.5],
        [2.6, -0.35, 0.15],
        [-2.2, 0.15, 0.5],
        [0.9, 0.15, -0.8],
      ] as [number, number, number][],
    [],
  );
  return (
    <>
      {positions.map((p, i) => (
        <Float key={i} speed={1.1 + i * 0.12} rotationIntensity={0.35} floatIntensity={0.55}>
          <Sphere args={[0.12 + (i % 4) * 0.045, 24, 24]} position={p}>
            <meshStandardMaterial
              color={i % 3 === 0 ? '#818cf8' : i % 3 === 1 ? '#22d3ee' : '#c084fc'}
              transparent
              opacity={0.55}
              roughness={0.12}
              metalness={0.45}
              emissive={i % 2 === 0 ? '#6366f1' : '#06b6d4'}
              emissiveIntensity={0.35}
            />
          </Sphere>
        </Float>
      ))}
    </>
  );
}

function SkillSphere() {
  const ref = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.22;
    if (ringRef.current) ringRef.current.rotation.z += dt * 0.15;
  });
  return (
    <group position={[2.15, 0.08, 0]}>
      <Float speed={1.4} rotationIntensity={0.18} floatIntensity={0.32}>
        <Sphere ref={ref} args={[0.92, 64, 64]}>
          <MeshDistortMaterial
            color="#4f46e5"
            attach="material"
            distort={0.38}
            speed={2.2}
            roughness={0.12}
            metalness={0.65}
            transparent
            opacity={0.88}
            emissive="#6366f1"
            emissiveIntensity={0.45}
          />
        </Sphere>
        {/* Outer glow ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 2.5, 0.15, 0]}>
          <torusGeometry args={[1.12, 0.028, 16, 80]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.85}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Soft outer shell */}
        <Sphere args={[1.05, 32, 32]}>
          <meshStandardMaterial
            color="#818cf8"
            transparent
            opacity={0.12}
            roughness={0.1}
            metalness={0.2}
            side={THREE.BackSide}
          />
        </Sphere>
      </Float>
    </group>
  );
}

function Particles() {
  const dots = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 40; i++) {
      out.push([
        (Math.random() - 0.5) * 7,
        (Math.random() - 0.5) * 3.2,
        (Math.random() - 0.5) * 2 - 0.5,
      ]);
    }
    return out;
  }, []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.04;
  });
  return (
    <group ref={ref}>
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshBasicMaterial color="#a5b4fc" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[3.5, 2.5, 3]} intensity={1.4} color="#c4b5fd" />
      <pointLight position={[-2.5, -1.5, 2]} intensity={0.7} color="#67e8f9" />
      <pointLight position={[2.2, 0.2, 2]} intensity={1.1} color="#818cf8" />
      <Particles />
      <PathRibbon />
      <Orbs />
      <SkillSphere />
    </>
  );
}

export function DashboardHero3D({ percent }: { percent: number }) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/50 via-violet-900/40 to-slate-950" />
        <div className="absolute right-[10%] top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-indigo-500/40 blur-sm ring-2 ring-cyan-400/40" />
        <div className="absolute left-[35%] top-1/2 h-2 w-[30%] -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-500/60 to-cyan-400/50 blur-[2px]" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <Suspense
        fallback={
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/40 via-violet-900/30 to-slate-950" />
        }
      >
        <Canvas
          dpr={[1, 1.6]}
          camera={{ position: [0, 0.1, 5.4], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <Scene />
        </Canvas>
      </Suspense>
      {/* Percent badge on sphere — mockup style */}
      <div className="absolute right-[6%] top-1/2 hidden -translate-y-1/2 flex-col items-center md:flex lg:right-[8%]">
        <span className="text-4xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(99,102,241,0.7)] lg:text-5xl">
          {percent}%
        </span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/90">
          Skill Completion
        </span>
      </div>
    </div>
  );
}

export default DashboardHero3D;
