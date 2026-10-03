import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Realistic Dala-style particle brain.
 * Dual hemispheres + longitudinal fissure + gyri noise on a surface shell
 * (like GLTF vertex sampling). Tiny wireframe cubes, distance-field hover,
 * camera parallax. Palette matches threejs-dala replica.
 */

const COUNT = 3600;
const COLORS = ['#963CBD', '#FF6F61', '#C5299B', '#FEAE51', '#d4b0e8', '#ffffff'];

/** Sample a point on a brain-like surface (two lobes + wrinkles). */
function sampleBrainPoint(out: THREE.Vector3): void {
  // Which hemisphere
  const side = Math.random() < 0.5 ? -1 : 1;

  // Parametric ellipsoid for one lobe
  const u = Math.random() * Math.PI * 2;
  const v = Math.acos(2 * Math.random() - 1);

  // Surface shell (not filled volume) — Dala uses mesh vertices
  const rx = 0.42 + Math.random() * 0.06;
  const ry = 0.52 + Math.random() * 0.05;
  const rz = 0.38 + Math.random() * 0.05;

  let x = rx * Math.sin(v) * Math.cos(u);
  let y = ry * Math.cos(v);
  let z = rz * Math.sin(v) * Math.sin(u);

  // Offset lobe away from mid-sagittal plane (fissure gap)
  x = x * 0.85 + side * 0.28;

  // Flatten underside slightly (brain sits on brainstem-ish)
  if (y < -0.15) y *= 0.72;

  // Gyri / sulci: multi-frequency noise along the surface
  const gyri =
    0.035 * Math.sin(u * 6 + v * 4) +
    0.028 * Math.sin(u * 11 - v * 7) +
    0.02 * Math.cos(u * 3 + v * 9) +
    0.015 * Math.sin((x + y) * 14);

  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  const n = 1 + gyri / len;
  x *= n;
  y *= n;
  z *= n;

  // Slight forward frontal lobe bias
  z += 0.06 * Math.max(0, y + 0.2);

  // Tiny random jitter
  x += (Math.random() - 0.5) * 0.02;
  y += (Math.random() - 0.5) * 0.02;
  z += (Math.random() - 0.5) * 0.02;

  out.set(x, y, z);
}

function BrainParticles({ ready }: { ready: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { viewport, pointer, camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetCam = useRef({ x: 0, y: 0 });
  const pointer3 = useRef(new THREE.Vector3());
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const palette = useMemo(() => COLORS.map((c) => new THREE.Color(c)), []);

  const { pos, baseScale, rotSeed, col } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const baseScale = new Float32Array(COUNT);
    const rotSeed = new Float32Array(COUNT);
    const col = new Uint8Array(COUNT);
    const p = new THREE.Vector3();

    for (let i = 0; i < COUNT; i++) {
      sampleBrainPoint(p);
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      // Dala: randFloat(0.3, 3) relative size — keep small absolute cubes
      baseScale[i] = 0.005 + Math.random() * 0.012;
      rotSeed[i] = (Math.random() * 2 - 1) * Math.PI;
      col[i] = Math.floor(Math.random() * palette.length);
    }
    return { pos, baseScale, rotSeed, col };
  }, [palette.length]);

  useEffect(() => {
    if (!mesh.current) return;
    for (let i = 0; i < COUNT; i++) {
      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.scale.setScalar(0.0003);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, palette[col[i]]);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [pos, col, palette, dummy]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;

    // Smooth camera parallax (Dala ~0.15 / 0.1)
    targetCam.current.x = pointer.x * 0.18;
    targetCam.current.y = pointer.y * 0.11;
    camera.position.x += (targetCam.current.x - camera.position.x) * 0.05;
    camera.position.y += (targetCam.current.y - camera.position.y) * 0.05;
    camera.position.z = 2.15;
    camera.lookAt(0, 0.02, 0);

    // Project pointer into particle space for distance field
    pointer3.current.set(
      pointer.x * viewport.width * 0.32,
      pointer.y * viewport.height * 0.32,
      0,
    );

    const appear = ready ? Math.min(1, Math.max(0, (t - 0.15) * 0.5)) : 0;
    const hover = ready ? 1 : 0;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const bx = pos[ix];
      const by = pos[ix + 1];
      const bz = pos[ix + 2];

      tmp.set(bx, by, bz);
      const dist = tmp.distanceTo(pointer3.current);
      // smoothstep(0.5, 0.12, d)
      const c = THREE.MathUtils.smoothstep(0.12, 0.52, dist);
      const influence = (1 - c) * hover;

      // scale = uSize + c * 8 * uHover
      const s = baseScale[i] * appear * (1 + influence * 6.5);

      // Subtle organic drift
      const breath = Math.sin(t * 0.5 + rotSeed[i]) * 0.006;
      const driftX = Math.sin(t * 0.28 + rotSeed[i] * 1.3) * 0.005;
      const driftZ = Math.cos(t * 0.24 + rotSeed[i]) * 0.005;

      dummy.position.set(bx + driftX, by + breath, bz + driftZ);

      // Rotation intensifies near cursor (Dala rotate in xz/xy)
      const spin = rotSeed[i] + t * 0.2 + influence * Math.PI * 1.4;
      dummy.rotation.set(
        spin * 0.55 + influence * 0.8,
        spin * 0.9,
        spin * 0.35 + influence * 0.5,
      );
      dummy.scale.setScalar(Math.max(0.0003, s));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
    // Slow whole-brain turn
    mesh.current.rotation.y = t * 0.04;
    mesh.current.rotation.x = Math.sin(t * 0.08) * 0.04;
  });

  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, COUNT]}>
      {/* Wireframe reads closer to Dala replica cubes */}
      <meshBasicMaterial toneMapped={false} wireframe transparent opacity={0.92} />
    </instancedMesh>
  );
}

function Scene({ ready }: { ready: boolean }) {
  return (
    <>
      <ambientLight intensity={1} />
      <BrainParticles ready={ready} />
    </>
  );
}

export function DalaBrainHero({ ready = true }: { ready?: boolean }) {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0.05, 2.15], fov: 50, near: 0.1, far: 50 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Scene ready={ready} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, transparent 30%, rgba(0,0,0,0.35) 58%, rgba(0,0,0,0.88) 100%)',
        }}
      />
    </div>
  );
}
