/**
 * 3D-A: Hero scene — floating glass orbs + skill sphere (react-three-fiber).
 * Falls back to CSS gradient if reduced motion.
 */
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import type { Mesh } from 'three';

function Orbs() {
  const positions = useMemo(
    () =>
      [
        [-2.2, 0.6, -1],
        [2.4, -0.4, -0.5],
        [-1.4, -0.8, 0.4],
        [1.6, 0.9, -1.2],
        [0.2, -1.1, -0.8],
      ] as [number, number, number][],
    [],
  );
  return (
    <>
      {positions.map((p, i) => (
        <Float key={i} speed={1.2 + i * 0.15} rotationIntensity={0.4} floatIntensity={0.6}>
          <Sphere args={[0.18 + (i % 3) * 0.06, 24, 24]} position={p}>
            <meshStandardMaterial
              color={i % 2 === 0 ? '#818cf8' : '#22d3ee'}
              transparent
              opacity={0.45}
              roughness={0.15}
              metalness={0.35}
            />
          </Sphere>
        </Float>
      ))}
    </>
  );
}

function SkillSphere() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });
  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.35}>
      <Sphere ref={ref} args={[0.95, 48, 48]} position={[1.8, 0.1, 0]}>
        <MeshDistortMaterial
          color="#6366f1"
          attach="material"
          distort={0.25}
          speed={2}
          roughness={0.2}
          metalness={0.55}
          transparent
          opacity={0.85}
        />
      </Sphere>
      <mesh rotation={[Math.PI / 2.4, 0.2, 0]} position={[1.8, 0.1, 0]}>
        <torusGeometry args={[1.15, 0.03, 12, 64]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[4, 3, 4]} intensity={1.2} color="#a5b4fc" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#67e8f9" />
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
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/40 via-violet-700/30 to-cyan-600/20"
        aria-hidden
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <Suspense
        fallback={
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-violet-800/20 to-slate-950" />
        }
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 5.2], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <Scene />
        </Canvas>
      </Suspense>
      <div className="absolute right-[8%] top-1/2 hidden -translate-y-1/2 flex-col items-center md:flex">
        <span className="text-4xl font-black tracking-tight text-white drop-shadow-lg">{percent}%</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/90">
          Skill path
        </span>
      </div>
    </div>
  );
}

export default DashboardHero3D;
