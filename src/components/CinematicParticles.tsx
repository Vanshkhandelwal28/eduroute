/**
 * River-flow particles with Bridson curl-noise fluid field.
 * Morph targets + divergence-free advection + velocity damping.
 */
import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildAllShapes, morphTargets, type ShapeName } from '../webgl/particleShapes';
import { curlNoise } from '../webgl/curlNoise';

const ACCENT = new THREE.Color('#c8f542');
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
  const initialized = useRef(false);

  const shapes = useMemo(() => buildAllShapes(count), [count]);
  const statePos = useMemo(() => new Float32Array(count * 3), [count]);
  const stateVel = useMemo(() => new Float32Array(count * 3), [count]);

  const colors = useMemo(() => {
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const mix = (i * 0.618) % 1;
      const col = BASE.clone().lerp(ACCENT, mix * 0.4);
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return c;
  }, [count]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(statePos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [statePos, colors]);

  useEffect(() => {
    const S = shapes.scatter;
    for (let i = 0; i < count * 3; i++) {
      statePos[i] = S[i];
      stateVel[i] = 0;
    }
    geo.attributes.position.needsUpdate = true;
    initialized.current = true;
  }, [shapes, count, statePos, stateVel, geo]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const smoothProgress = useRef(0);
  const prevProgress = useRef(0);

  useFrame((clockState, delta) => {
    if (!initialized.current) return;

    const dt = Math.min(delta, 0.048);
    const raw = progressRef.current;
    smoothProgress.current += (raw - smoothProgress.current) * Math.min(1, dt * 3.5);
    const scrollSpeed = Math.abs(raw - prevProgress.current) / Math.max(dt, 0.001);
    prevProgress.current = raw;

    const { from, to, t, cameraZ, rotY } = morphTargets(smoothProgress.current);
    const A = shapes[from as ShapeName];
    const B = shapes[to as ShapeName];

    const time = clockState.clock.elapsedTime;

    // Morph attractor strength + viscosity-like damping
    const attract = 1.8 + Math.min(scrollSpeed * 0.4, 2.5);
    const damp = 0.91;
    // Curl turbulence stronger while morphing / scrolling
    const morphActivity = Math.sin(t * Math.PI); // peak mid-transition
    const curlStr = 0.55 + morphActivity * 0.45 + Math.min(scrollSpeed * 0.15, 0.5);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const px = statePos[i3];
      const py = statePos[i3 + 1];
      const pz = statePos[i3 + 2];

      // Continuous morph target
      const tx = A[i3] + (B[i3] - A[i3]) * t;
      const ty = A[i3 + 1] + (B[i3 + 1] - A[i3 + 1]) * t;
      const tz = A[i3 + 2] + (B[i3 + 2] - A[i3 + 2]) * t;

      // Divergence-free curl noise (river field)
      const c = curlNoise(px, py, pz, time + i * 0.002, 0.7);

      // Mouse = soft current
      const mx = mouse.current.x * 0.08;
      const my = mouse.current.y * 0.06;

      // Force toward target + fluid advection
      const fx = (tx - px) * attract + c.x * curlStr + mx;
      const fy = (ty - py) * attract + c.y * curlStr + my;
      const fz = (tz - pz) * attract + c.z * curlStr;

      // Semi-implicit integrate (viscous fluid feel)
      stateVel[i3] = stateVel[i3] * damp + fx * dt;
      stateVel[i3 + 1] = stateVel[i3 + 1] * damp + fy * dt;
      stateVel[i3 + 2] = stateVel[i3 + 2] * damp + fz * dt;

      statePos[i3] += stateVel[i3];
      statePos[i3 + 1] += stateVel[i3 + 1];
      statePos[i3 + 2] += stateVel[i3 + 2];
    }

    geo.attributes.position.needsUpdate = true;

    if (pointsRef.current) {
      pointsRef.current.rotation.y +=
        (rotY + time * 0.035 - pointsRef.current.rotation.y) * 0.035;
    }

    camera.position.z += (cameraZ - camera.position.z) * 0.05;
    camera.position.x += (mouse.current.x * 0.12 - camera.position.x) * 0.04;
    camera.position.y += (mouse.current.y * 0.08 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        size={0.02}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.92}
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
    if (typeof window === 'undefined') return 3200;
    return window.innerWidth < 768 ? 1500 : window.innerWidth < 1200 ? 2400 : 3600;
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
    return <div className="absolute inset-0 bg-[#080808]" />;
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
          <fog attach="fog" args={['#080808', 5, 14]} />
          <ParticleField progressRef={progressRef} count={count} />
        </Suspense>
      </Canvas>
    </div>
  );
}
