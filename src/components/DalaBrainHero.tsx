import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Dala-faithful interactive particle field.
 * Small triangular particles form a soft volumetric shape,
 * react to mouse, breathe, and slowly rotate — pure black canvas.
 */

const COUNT = 2200;

function TriangleParticles({ ready }: { ready: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { viewport, pointer } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const palette = useMemo(
    () => [
      new THREE.Color('#ffffff'),
      new THREE.Color('#e8e8e8'),
      new THREE.Color('#c0c0c0'),
      new THREE.Color('#a0a0a0'),
      new THREE.Color('#818CF8'),
      new THREE.Color('#963CBD'),
    ],
    [],
  );

  const { pos, scale, col } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const scale = new Float32Array(COUNT);
    const col = new Uint8Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 0.5 + Math.random() * 0.55;
      let x = r * Math.sin(phi) * Math.cos(theta) * 1.2;
      let y = r * Math.cos(phi) * 0.9;
      let z = r * Math.sin(phi) * Math.sin(theta) * 0.95;
      x += (Math.random() - 0.5) * 0.3;
      y += (Math.random() - 0.5) * 0.25;
      z += (Math.random() - 0.5) * 0.3;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      scale[i] = 0.006 + Math.random() * 0.016;
      col[i] = Math.floor(Math.random() * palette.length);
    }
    return { pos, scale, col };
  }, [palette.length]);

  useEffect(() => {
    if (!mesh.current) return;
    for (let i = 0; i < COUNT; i++) {
      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, palette[col[i]]);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [pos, scale, col, palette, dummy]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    const mx = pointer.x * viewport.width * 0.4;
    const my = pointer.y * viewport.height * 0.4;
    const appear = ready ? Math.min(1, t * 0.45) : 0;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const bx = pos[ix];
      const by = pos[ix + 1];
      const bz = pos[ix + 2];
      const dx = bx - mx * 0.35;
      const dy = by - my * 0.35;
      const dist = Math.sqrt(dx * dx + dy * dy + bz * bz * 0.5);
      const force = Math.max(0, 1 - dist * 1.6);
      const breathe = Math.sin(t * 0.65 + i * 0.012) * 0.012;
      const s = scale[i] * appear * (1 + force * 2.2);

      dummy.position.set(
        bx + dx * force * 0.25 + Math.sin(t * 0.4 + i) * 0.006,
        by + dy * force * 0.25 + breathe,
        bz + Math.cos(t * 0.35 + i * 0.015) * 0.008,
      );
      dummy.scale.setScalar(Math.max(0.0005, s));
      dummy.rotation.set(t * 0.3 + i * 0.02, t * 0.2, t * 0.1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.rotation.y = t * 0.07;
    mesh.current.rotation.x = Math.sin(t * 0.12) * 0.06;
  });

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0.6, 0,
      -0.5, -0.35, 0,
      0.5, -0.35, 0,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, COUNT]}>
      <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function Scene({ ready }: { ready: boolean }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <TriangleParticles ready={ready} />
    </>
  );
}

export function DalaBrainHero({ ready = true }: { ready?: boolean }) {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 2.4], fov: 50 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <Scene ready={ready} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(0,0,0,0.4)_55%,rgba(0,0,0,0.92)_100%)]" />
    </div>
  );
}
