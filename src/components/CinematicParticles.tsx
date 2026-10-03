/**
 * River-flow particles: positions integrate toward morph targets
 * with velocity damping — continuous stream, never snaps/breaks.
 */
import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildAllShapes, morphTargets, type ShapeName } from '../webgl/particleShapes';

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

  // Live state: position + velocity (river simulation)
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

  // Seed from scatter
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

    const dt = Math.min(delta, 0.05);
    // Smooth scroll progress so scrubbing doesn't jerk particles
    const raw = progressRef.current;
    smoothProgress.current += (raw - smoothProgress.current) * Math.min(1, dt * 4);
    const scrollSpeed = Math.abs(raw - prevProgress.current) / Math.max(dt, 0.001);
    prevProgress.current = raw;

    const { from, to, t, cameraZ, rotY } = morphTargets(smoothProgress.current);
    const A = shapes[from as ShapeName];
    const B = shapes[to as ShapeName];

    const time = clockState.clock.elapsedTime;
    // Spring strength — stronger when settling, gentler when morphing fast
    const flow = 2.2 + Math.min(scrollSpeed * 0.5, 3);
    const damp = 0.88;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Target along continuous morph path
      const tx = A[i3] + (B[i3] - A[i3]) * t;
      const ty = A[i3 + 1] + (B[i3 + 1] - A[i3 + 1]) * t;
      const tz = A[i3 + 2] + (B[i3 + 2] - A[i3 + 2]) * t;

      // Curl-like stream offset (river turbulence)
      const phase = i * 0.07 + time * 0.35;
      const streamX = Math.sin(phase + ty * 2) * 0.02;
      const streamY = Math.cos(phase * 0.9 + tx * 2) * 0.015;
      const streamZ = Math.sin(phase * 1.1 + tz) * 0.02;

      // Mouse as soft current
      const mx = mouse.current.x * 0.06;
      const my = mouse.current.y * 0.05;

      const dx = tx + streamX + mx - statePos[i3];
      const dy = ty + streamY + my - statePos[i3 + 1];
      const dz = tz + streamZ - statePos[i3 + 2];

      // Accelerate toward target (river flowing to shape)
      stateVel[i3] = stateVel[i3] * damp + dx * flow * dt;
      stateVel[i3 + 1] = stateVel[i3 + 1] * damp + dy * flow * dt;
      stateVel[i3 + 2] = stateVel[i3 + 2] * damp + dz * flow * dt;

      statePos[i3] += stateVel[i3];
      statePos[i3 + 1] += stateVel[i3 + 1];
      statePos[i3 + 2] += stateVel[i3 + 2];
    }

    geo.attributes.position.needsUpdate = true;

    if (pointsRef.current) {
      pointsRef.current.rotation.y += (rotY + time * 0.04 - pointsRef.current.rotation.y) * 0.04;
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
    return window.innerWidth < 768 ? 1600 : window.innerWidth < 1200 ? 2600 : 3800;
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
