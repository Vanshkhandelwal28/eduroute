/**
 * Dala-matched brain (kekkorider/threejs-dala)
 * - exact smoothstep(0.45, 0.1, d) + scale * 8 * uHover
 * - hit-only hover (raycast brain mesh)
 * - window mouse/touch → NDC
 * - purple radial bg, transparent canvas, load fade-in
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

/** Exact upstream brain.vertex.glsl (rotate inlined) */
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
  float c = smoothstep(0.45, 0.1, d);

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

type MouseState = { x: number; y: number; active: boolean };

function BrainInstances({
  ready,
  mouseRef,
  onModelReady,
}: {
  ready: boolean;
  mouseRef: React.MutableRefObject<MouseState>;
  onModelReady: () => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hitMeshRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const targetPoint = useRef(new THREE.Vector3());
  const smoothPoint = useRef(new THREE.Vector3());
  const hoverRef = useRef(0);
  const targetHover = useRef(0);
  const camTarget = useRef({ x: 0, y: 0 });
  const notified = useRef(false);

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
    if (!notified.current) {
      notified.current = true;
      onModelReady();
    }
  }, [count, brainGeo, onModelReady]);

  useFrame(() => {
    if (!meshRef.current || count === 0) return;

    const { x, y, active } = mouseRef.current;

    // Camera parallax — threejs-dala (gsap ~0.5s ≈ lerp 0.08–0.1)
    camTarget.current.x = x * 0.15;
    camTarget.current.y = y * 0.1;
    camera.position.x += (camTarget.current.x - camera.position.x) * 0.1;
    camera.position.y += (camTarget.current.y - camera.position.y) * 0.1;
    camera.position.z = size.width < 767 ? 2.3 : 1.2;
    camera.lookAt(0, 0, 0);

    // Hit-only hover (upstream): uHover 1 on brain ray hit, else 0
    if (ready && active) {
      ndc.set(x, y);
      raycaster.setFromCamera(ndc, camera);

      if (hitMeshRef.current) {
        hitMeshRef.current.updateMatrixWorld(true);
        const hits = raycaster.intersectObject(hitMeshRef.current, false);
        if (hits.length > 0 && hits[0]) {
          targetHover.current = 1;
          targetPoint.current.copy(hits[0].point);
        } else {
          targetHover.current = 0;
        }
      } else {
        targetHover.current = 0;
      }
    } else {
      targetHover.current = 0;
    }

    // Smooth like GSAP duration 0.25–0.3
    smoothPoint.current.lerp(targetPoint.current, 0.18);
    hoverRef.current += (targetHover.current - hoverRef.current) * 0.14;

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
  onModelReady,
}: {
  ready: boolean;
  mouseRef: React.MutableRefObject<MouseState>;
  onModelReady: () => void;
}) {
  return (
    <Suspense fallback={null}>
      <BrainInstances ready={ready} mouseRef={mouseRef} onModelReady={onModelReady} />
    </Suspense>
  );
}

useGLTF.preload(BRAIN_URL);

/** Upstream index.scss — no heavy black edge */
const DALA_BG =
  'radial-gradient(circle at 50% 45%, #692a84 0%, #3c184c 65%)';

export function DalaBrainHero({ ready = true }: { ready?: boolean }) {
  const [webglOk, setWebglOk] = useState(true);
  const [modelReady, setModelReady] = useState(false);
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

  // Window mouse/touch — NDC relative to hero (threejs-dala _onMousemove)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateFromClient = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.x = THREE.MathUtils.clamp(x, -1.2, 1.2);
      mouseRef.current.y = THREE.MathUtils.clamp(y, -1.2, 1.2);
      mouseRef.current.active = true;
    };

    const onMouseMove = (e: MouseEvent) => updateFromClient(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) updateFromClient(t.clientX, t.clientY);
    };
    const onLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    el.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchstart', onTouch);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (!webglOk) {
    return <div className="absolute inset-0 z-0" style={{ background: DALA_BG }} />;
  }

  const showCanvas = modelReady && ready;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      style={{ background: DALA_BG }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: showCanvas ? 1 : 0,
          transition: 'opacity 1s ease',
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 1.2], fov: 75, near: 0.1, far: 100 }}
          dpr={[
            1,
            Math.min(1.5, typeof window !== 'undefined' ? window.devicePixelRatio : 1),
          ]}
          gl={{
            antialias:
              typeof window !== 'undefined' ? window.devicePixelRatio === 1 : true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Scene
            ready={ready}
            mouseRef={mouseRef}
            onModelReady={() => setModelReady(true)}
          />
        </Canvas>
      </div>
    </div>
  );
}
