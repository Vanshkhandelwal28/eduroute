import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Dala-style interactive particle field (inspired by dala.craftedbygc.com).
 * Tiny instanced cubes form a volumetric "shared brain" shape.
 * Mouse ray proximity scales + rotates particles (shader-distance behavior in JS).
 * Camera parallax follows pointer. Pure black canvas + Dala palette.
 */

const COUNT = 2800;

// Official Dala replica palette
const COLORS = ['#963CBD', '#FF6F61', '#C5299B', '#FEAE51', '#e8e0f0', '#ffffff'];

function BrainParticles({ ready }: { ready: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { viewport, pointer, camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetCam = useRef({ x: 0, y: 0 });

  const palette = useMemo(() => COLORS.map((c) => new THREE.Color(c)), []);

  const { pos, baseScale, rotSeed, col } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const baseScale = new Float32Array(COUNT);
    const rotSeed = new Float32Array(COUNT);
    const col = new Uint8Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // Sphere / brain-ish volume (like vertices on a soft head form)
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      // Slightly elongated + denser core
      const r = Math.pow(Math.random(), 0.55) * 0.95 + 0.15;
      let x = r * Math.sin(phi) * Math.cos(theta) * 1.15;
      let y = r * Math.cos(phi) * 0.95;
      let z = r * Math.sin(phi) * Math.sin(theta) * 1.0;
      // Noise so it feels organic, not a perfect sphere
      x += (Math.random() - 0.5) * 0.22;
      y += (Math.random() - 0.5) * 0.18;
      z += (Math.random() - 0.5) * 0.22;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      baseScale[i] = 0.004 + Math.random() * 0.014;
      rotSeed[i] = Math.random() * Math.PI * 2;
      col[i] = Math.floor(Math.random() * palette.length);
    }
    return { pos, baseScale, rotSeed, col };
  }, [palette.length]);

  useEffect(() => {
    if (!mesh.current) return;
    for (let i = 0; i < COUNT; i++) {
      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.scale.setScalar(0.0005);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, palette[col[i]]);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [pos, baseScale, col, palette, dummy]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;

    // Camera parallax (Dala: GSAP to x*0.15, y*0.1)
    targetCam.current.x = pointer.x * 0.22;
    targetCam.current.y = pointer.y * 0.14;
    camera.position.x += (targetCam.current.x - camera.position.x) * 0.06;
    camera.position.y += (targetCam.current.y - camera.position.y) * 0.06;
    camera.lookAt(0, 0, 0);

    // Pointer in world-ish space for distance field
    const mx = pointer.x * viewport.width * 0.35;
    const my = pointer.y * viewport.height * 0.35;
    const appear = ready ? Math.min(1, (t - 0.2) * 0.55) : 0;
    const hoverBoost = ready ? 1 : 0;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const bx = pos[ix];
      const by = pos[ix + 1];
      const bz = pos[ix + 2];

      // Distance to projected pointer (smoothstep-like falloff, Dala shader style)
      const dx = bx - mx;
      const dy = by - my;
      const dist = Math.sqrt(dx * dx + dy * dy + bz * bz * 0.35);
      // c ≈ smoothstep(0.45, 0.1, d)
      const c = Math.max(0, Math.min(1, (0.55 - dist) / 0.4));

      // Scale: uSize + c * 8 * uHover
      const s = baseScale[i] * appear * (1 + c * 7.5 * hoverBoost);
      const breathe = Math.sin(t * 0.55 + i * 0.01) * 0.01;

      dummy.position.set(
        bx + Math.sin(t * 0.35 + rotSeed[i]) * 0.008,
        by + breathe,
        bz + Math.cos(t * 0.3 + rotSeed[i]) * 0.008,
      );

      // Rotation intensifies near cursor
      const spin = rotSeed[i] + t * 0.25 + c * Math.PI * 1.2 * hoverBoost;
      dummy.rotation.set(spin * 0.7, spin, spin * 0.4);
      dummy.scale.setScalar(Math.max(0.0004, s));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
    // Slow whole-cloud drift
    mesh.current.rotation.y = t * 0.05;
    mesh.current.rotation.x = Math.sin(t * 0.1) * 0.05;
  });

  // Tiny cubes — same idea as Dala BoxGeometry(0.004)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, COUNT]}>
      <meshBasicMaterial toneMapped={false} wireframe={false} />
    </instancedMesh>
  );
}

function Scene({ ready }: { ready: boolean }) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <BrainParticles ready={ready} />
    </>
  );
}

export function DalaBrainHero({ ready = true }: { ready?: boolean }) {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 55, near: 0.1, far: 40 }}
        dpr={[1, 1.6]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Scene ready={ready} />
      </Canvas>
      {/* Vignette — keeps type readable over dense particles */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 25%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.92) 100%)',
        }}
      />
    </div>
  );
}
