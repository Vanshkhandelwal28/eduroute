/**
 * threejs-dala brain — interactive via explicit window mouse/touch listeners
 * (same approach as upstream _onMousemove)
 */
import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const BRAIN_URL =
  'https://cdn.jsdelivr.net/gh/kekkorider/threejs-dala@main/static/brain.glb';

const COLORS = [
  new THREE.Color(0x963cbd),
  new THREE.Color(0xff6f61),
  new THREE.Color(0xc5299b),
  new THREE.Color(0xfeae51),
];

const vertexShader = /* glsl */ `
uniform vec3 uPointer;
uniform float uHover;

attribute float aRotation;
attribute float aSize;
attribute vec3 aColor;

varying vec3 vColor;

#define PI 3.14159265359

mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec4 mvPosition = vec4(position, 1.0);
  mvPosition = instanceMatrix * mvPosition;

  float d = distance(uPointer, mvPosition.xyz);
  float c = smoothstep(0.5, 0.05, d);

  float scale = aSize + c * 8.0 * uHover;
  vec3 pos = position;
  pos *= scale;
  pos.xz *= rotate(PI * c * aRotation + PI * aRotation * 0.43);
  pos.xy *= rotate(PI * c * aRotation + PI * aRotation * 0.71);

  mvPosition = instanceMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
  vColor = aColor;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

/** Shared NDC mouse written by window listeners */
type MouseState = {
  x: number;
  y: number;
  active: boolean;
};

function BrainInstances({
  ready,
  mouseRef,
}: {
  ready: boolean;
  mouseRef: React.MutableRefObject<MouseState>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hitMeshRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const planeHit = useMemo(() => new THREE.Vector3(), []);
  const targetPoint = useRef(new THREE.Vector3());
  const smoothPoint = useRef(new THREE.Vector3());
  const hoverRef = useRef(0);
  const targetHover = useRef(0);
  const camTarget = useRef({ x: 0, y: 0 });

  const uniforms = useMemo(
    () => ({
      uPointer: { value: new THREE.Vector3() },
      uHover: { value: 0 },
    }),
    [],
  );

  const gltf = useGLTF(BRAIN_URL);

  const brainGeo = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    gltf.scene.traverse((obj) => {
      if (!mesh && (obj as THREE.Mesh).isMesh) mesh = obj as THREE.Mesh;
    });
    return mesh?.geometry ?? null;
  }, [gltf]);

  const { count, boxGeo } = useMemo(() => {
    if (!brainGeo) {
      return { count: 0, boxGeo: new THREE.BoxGeometry(0.004, 0.004, 0.004) };
    }
    const posAttr = brainGeo.attributes.position;
    const count = posAttr.count;
    const boxGeo = new THREE.BoxGeometry(0.004, 0.004, 0.004);
    const aRotation = new Float32Array(count);
    const aSize = new Float32Array(count);
    const aColor = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      aRotation[i] = THREE.MathUtils.randFloat(-1, 1);
      aSize[i] = THREE.MathUtils.randFloat(0.3, 3);
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      aColor[i * 3] = col.r;
      aColor[i * 3 + 1] = col.g;
      aColor[i * 3 + 2] = col.b;
    }

    boxGeo.setAttribute('aRotation', new THREE.InstancedBufferAttribute(aRotation, 1));
    boxGeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 1));
    boxGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));

    return { count, boxGeo };
  }, [brainGeo]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        wireframe: true,
        uniforms,
      }),
    [uniforms],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !brainGeo || count === 0) return;
    const positions = brainGeo.attributes.position;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(positions.getX(i), positions.getY(i), positions.getZ(i));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, brainGeo]);

  useFrame(() => {
    if (!meshRef.current || count === 0) return;

    const { x, y, active } = mouseRef.current;

    // Camera parallax — gsap equivalent
    camTarget.current.x = x * 0.15;
    camTarget.current.y = y * 0.1;
    camera.position.x += (camTarget.current.x - camera.position.x) * 0.08;
    camera.position.y += (camTarget.current.y - camera.position.y) * 0.08;
    camera.position.z = size.width < 767 ? 2.3 : 1.2;
    camera.lookAt(0, 0, 0);

    if (!ready || !active) {
      targetHover.current = 0;
      hoverRef.current += (0 - hoverRef.current) * 0.08;
      uniforms.uHover.value = hoverRef.current;
      uniforms.uPointer.value.copy(smoothPoint.current);
      return;
    }

    // NDC from our window listener (not R3F pointer)
    ndc.set(x, y);
    raycaster.setFromCamera(ndc, camera);

    let hit = false;
    if (hitMeshRef.current) {
      hitMeshRef.current.updateMatrixWorld(true);
      const hits = raycaster.intersectObject(hitMeshRef.current, false);
      if (hits.length > 0 && hits[0]) {
        hit = true;
        targetPoint.current.copy(hits[0].point);
        targetHover.current = 1;
      }
    }

    if (!hit) {
      const ok = raycaster.ray.intersectPlane(plane, planeHit);
      if (ok) {
        targetPoint.current.copy(planeHit);
        const r = Math.hypot(planeHit.x, planeHit.y);
        // Soft field across the whole hero so motion is always visible
        targetHover.current = THREE.MathUtils.clamp(1.15 - r * 1.2, 0.35, 1);
      } else {
        targetHover.current = 0.35;
      }
    }

    smoothPoint.current.lerp(targetPoint.current, 0.22);
    hoverRef.current += (targetHover.current - hoverRef.current) * 0.16;

    uniforms.uPointer.value.copy(smoothPoint.current);
    uniforms.uHover.value = hoverRef.current;
  });

  if (count === 0 || !brainGeo) return null;

  return (
    <>
      <mesh ref={hitMeshRef} geometry={brainGeo} visible={false}>
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <instancedMesh
        ref={meshRef}
        args={[boxGeo, material, count]}
        frustumCulled={false}
      />
    </>
  );
}

function Scene({
  ready,
  mouseRef,
}: {
  ready: boolean;
  mouseRef: React.MutableRefObject<MouseState>;
}) {
  return (
    <Suspense fallback={null}>
      <BrainInstances ready={ready} mouseRef={mouseRef} />
    </Suspense>
  );
}

useGLTF.preload(BRAIN_URL);

const DALA_BG =
  'radial-gradient(circle at 50% 45%, #692a84 0%, #3c184c 55%, #1a0a22 100%)';

export function DalaBrainHero({ ready = true }: { ready?: boolean }) {
  const [webglOk, setWebglOk] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, active: false });

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  /**
   * Explicit mouse / touch listeners (threejs-dala style).
   * NDC: x = clientX / width * 2 - 1, y = -(clientY / height * 2 - 1)
   * Relative to the hero container so parallax matches the canvas.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateFromClient = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.x = THREE.MathUtils.clamp(x, -1.5, 1.5);
      mouseRef.current.y = THREE.MathUtils.clamp(y, -1.5, 1.5);
      mouseRef.current.active = true;
    };

    const onMouseMove = (e: MouseEvent) => {
      updateFromClient(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) updateFromClient(t.clientX, t.clientY);
    };

    const onLeave = () => {
      // Keep last position but fade hover gently via useFrame when far
      mouseRef.current.active = false;
    };

    // Window-level so overlays (text) cannot block the listener
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchstart', onTouchMove, { passive: true });
    el.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchstart', onTouchMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (!webglOk) {
    return <div className="absolute inset-0 z-0" style={{ background: DALA_BG }} />;
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      style={{ background: DALA_BG }}
    >
      <Canvas
        camera={{ position: [0, 0, 1.2], fov: 75, near: 0.1, far: 100 }}
        dpr={[1, Math.min(1.5, typeof window !== 'undefined' ? window.devicePixelRatio : 1)]}
        gl={{
          antialias: typeof window !== 'undefined' ? window.devicePixelRatio === 1 : true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Scene ready={ready} mouseRef={mouseRef} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 42%, transparent 0%, transparent 40%, rgba(10,5,15,0.25) 70%, rgba(10,5,15,0.55) 100%)',
        }}
      />
    </div>
  );
}
