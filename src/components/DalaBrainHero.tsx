import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Interactive particle field inspired by the original Dala brain    */
/*  (kekkorider/threejs-dala). Mouse-reactive, pure black aesthetic.  */
/* ------------------------------------------------------------------ */

const PARTICLE_COUNT = 1800;

function ParticleBrain() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport, pointer } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(
    () => [
      new THREE.Color('#963CBD'),
      new THREE.Color('#FF6F61'),
      new THREE.Color('#C5299B'),
      new THREE.Color('#FEAE51'),
      new THREE.Color('#818CF8'),
    ],
    [],
  );

  // Pre-compute positions on a rough brain-like ellipsoid + noise
  const { positions, baseScales, colorIndices } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const baseScales = new Float32Array(PARTICLE_COUNT);
    const colorIndices = new Uint8Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spherical distribution with vertical stretch (brain silhouette)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 0.55 + Math.random() * 0.45;

      // Ellipsoid + slight front bias
      let x = r * Math.sin(phi) * Math.cos(theta) * 1.15;
      let y = r * Math.cos(phi) * 0.85;
      let z = r * Math.sin(phi) * Math.sin(theta) * 0.9;

      // Add organic noise
      x += (Math.random() - 0.5) * 0.25;
      y += (Math.random() - 0.5) * 0.2;
      z += (Math.random() - 0.5) * 0.25;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      baseScales[i] = 0.008 + Math.random() * 0.018;
      colorIndices[i] = Math.floor(Math.random() * colors.length);
    }
    return { positions, baseScales, colorIndices };
  }, [colors.length]);

  // Initialise instance matrices + colors once
  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
      );
      dummy.scale.setScalar(baseScales[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, colors[colorIndices[i]]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [positions, baseScales, colorIndices, colors, dummy]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const mx = pointer.x * viewport.width * 0.35;
    const my = pointer.y * viewport.height * 0.35;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const bx = positions[ix];
      const by = positions[ix + 1];
      const bz = positions[ix + 2];

      // Distance to mouse in world space (approx)
      const dx = bx - mx * 0.4;
      const dy = by - my * 0.4;
      const dist = Math.sqrt(dx * dx + dy * dy + bz * bz);

      // Hover repulsion / attraction
      const force = Math.max(0, 1 - dist * 1.8);
      const push = force * 0.22;

      // Gentle breathing + mouse reaction
      const breathe = Math.sin(t * 0.7 + i * 0.01) * 0.015;
      const scaleBoost = 1 + force * 1.8;

      dummy.position.set(
        bx + dx * push * 0.3 + Math.sin(t * 0.5 + i) * 0.008,
        by + dy * push * 0.3 + breathe,
        bz + Math.cos(t * 0.4 + i * 0.02) * 0.01,
      );
      dummy.scale.setScalar(baseScales[i] * scaleBoost);
      dummy.rotation.set(t * 0.2 + i * 0.01, t * 0.15, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Slow global rotation
    meshRef.current.rotation.y = t * 0.08;
    meshRef.current.rotation.x = Math.sin(t * 0.15) * 0.08;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <ParticleBrain />
    </>
  );
}

export function DalaBrainHero() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
      {/* Soft vignette so text stays readable */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_70%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
}
