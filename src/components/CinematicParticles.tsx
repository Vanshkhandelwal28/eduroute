/**
 * Single persistent Points system — morphs scatter→brain→bulb→earth→network→final
 * Driven by scroll progress ref (no React re-renders on scroll).
 */
import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildAllShapes, morphTargets, type ShapeName } from '../webgl/particleShapes';

const ACCENT = new THREE.Color('#c8f542'); // EduRoute acid accent on black
const BASE = new THREE.Color('#e8e6e1');

function ParticleField({
  progressRef,
  count,
}: {
  progressRef: React.MutableRefObject<number>;
  count: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const { camera } = useThree();

  const shapes = useMemo(() => buildAllShapes(count), [count]);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const colors = useMemo(() => {
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const mix = Math.random();
      const col = BASE.clone().lerp(ACCENT, mix * 0.35);
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return c;
  }, [count]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame((state) => {
    const p = progressRef.current;
    const { from, to, t, cameraZ, rotY } = morphTargets(p);
    const A = shapes[from as ShapeName];
    const B = shapes[to as ShapeName];
    const pos = geo.attributes.position.array as Float32Array;

    const time = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let x = A[i3] + (B[i3] - A[i3]) * t;
      let y = A[i3 + 1] + (B[i3 + 1] - A[i3 + 1]) * t;
      let z = A[i3 + 2] + (B[i3 + 2] - A[i3 + 2]) * t;
      // Subtle noise / breath
      const n = Math.sin(time * 0.6 + i * 0.05) * 0.012;
      x += n + mouse.current.x * 0.04;
      y += Math.cos(time * 0.5 + i * 0.03) * 0.01 + mouse.current.y * 0.03;
      z += n * 0.5;
      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;

    if (pointsRef.current) {
      pointsRef.current.rotation.y = rotY + time * 0.05;
    }

    camera.position.z += (cameraZ - camera.position.z) * 0.06;
    camera.position.x += (mouse.current.x * 0.15 - camera.position.x) * 0.04;
    camera.position.y += (mouse.current.y * 0.1 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        size={0.018}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function CinematicParticles({
  progressRef,
}: {
  progressRef: React.MutableRefObject<number>;
}) {
  const [webgl, setWebgl] = useState(true);
  const count = useMemo(() => {
    if (typeof window === 'undefined') return 3500;
    return window.innerWidth < 768 ? 1800 : window.innerWidth < 1200 ? 2800 : 4200;
  }, []);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      if (!(c.getContext('webgl') || c.getContext('experimental-webgl'))) setWebgl(false);
    } catch {
      setWebgl(false);
    }
  }, []);

  if (!webgl) {
    return (
      <div className="absolute inset-0 bg-[#080808]" />
    );
  }

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 55, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#080808', 4, 12]} />
          <ParticleField progressRef={progressRef} count={count} />
        </Suspense>
      </Canvas>
    </div>
  );
}
