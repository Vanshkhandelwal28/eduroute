/**
 * Port of kekkorider/threejs-dala — Dala.ai WebGL brain module
 * https://github.com/kekkorider/threejs-dala
 *
 * brain.glb vertices → InstancedMesh of micro BoxGeometry
 * Vertex shader: distance(uPointer) → smoothstep scale + rotate
 * Raycast on brain mesh · camera parallax (GSAP-style lerp)
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

function BrainInstances({ ready }: { ready: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const brainMeshRef = useRef<THREE.Mesh | null>(null);
  const { camera, size, pointer } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);
  const targetPoint = useRef(new THREE.Vector3());
  const smoothPoint = useRef(new THREE.Vector3());
  const hoverRef = useRef(0);
  const targetHover = useRef(0);
  const targetCam = useRef({ x: 0, y: 0 });
  const uniforms = useMemo(
    () => ({
      uPointer: { value: new THREE.Vector3() },
      uHover: { value: 0 },
    }),
    [],
  );

  const gltf = useGLTF(BRAIN_URL);

  // Resolve brain mesh once from GLTF
  useEffect(() => {
    let found: THREE.Mesh | null = null;
    gltf.scene.traverse((obj) => {
      if (!found && (obj as THREE.Mesh).isMesh) {
        found = obj as THREE.Mesh;
      }
    });
    if (found) {
      found.updateMatrixWorld(true);
      brainMeshRef.current = found;
    }
  }, [gltf]);

  const { count, boxGeo } = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    gltf.scene.traverse((obj) => {
      if (!mesh && (obj as THREE.Mesh).isMesh) mesh = obj as THREE.Mesh;
    });
    const posAttr = mesh?.geometry?.attributes?.position;
    const count = posAttr ? posAttr.count : 0;

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
  }, [gltf]);

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

  // Instance matrices = brain vertex positions (threejs-dala _loadModel)
  useEffect(() => {
    const mesh = meshRef.current;
    const brain = brainMeshRef.current;
    if (!mesh || !brain || count === 0) return;

    const positions = brain.geometry.attributes.position;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      dummy.position.set(positions.getX(i), positions.getY(i), positions.getZ(i));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, gltf]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    // Camera parallax — threejs-dala gsap.to(camera.position, { x: x*0.15, y: y*0.1 })
    targetCam.current.x = pointer.x * 0.15;
    targetCam.current.y = pointer.y * 0.1;
    camera.position.x += (targetCam.current.x - camera.position.x) * 0.1;
    camera.position.y += (targetCam.current.y - camera.position.y) * 0.1;
    camera.position.z = size.width < 767 ? 2.3 : 1.2;
    camera.lookAt(0, 0, 0);

    // Raycast brain (same as threejs-dala _onMousemove)
    mouse.set(pointer.x, pointer.y);
    raycaster.setFromCamera(mouse, camera);

    const brain = brainMeshRef.current;
    if (brain) {
      brain.updateMatrixWorld(true);
      const hits = raycaster.intersectObject(brain, false);
      if (hits.length > 0 && hits[0] && ready) {
        targetHover.current = 1;
        targetPoint.current.copy(hits[0].point);
      } else {
        targetHover.current = 0;
      }
    }

    smoothPoint.current.lerp(targetPoint.current, 0.18);
    hoverRef.current += (targetHover.current - hoverRef.current) * 0.15;

    uniforms.uPointer.value.copy(smoothPoint.current);
    uniforms.uHover.value = hoverRef.current;
  });

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[boxGeo, material, count]}
      frustumCulled={false}
    />
  );
}

function Scene({ ready }: { ready: boolean }) {
  return (
    <Suspense fallback={null}>
      <BrainInstances ready={ready} />
    </Suspense>
  );
}

useGLTF.preload(BRAIN_URL);

export function DalaBrainHero({ ready = true }: { ready?: boolean }) {
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  if (!webglOk) {
    return (
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, #692a84 0%, #3c184c 55%, #0a0a0a 100%)',
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      {/* Replica page background: radial purple */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, #692a84 0%, #3c184c 50%, #0a0a0a 100%)',
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 1.2], fov: 75, near: 0.1, far: 100 }}
        dpr={[1, Math.min(1.5, typeof window !== 'undefined' ? window.devicePixelRatio : 1)]}
        gl={{
          antialias: typeof window !== 'undefined' ? window.devicePixelRatio === 1 : true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Scene ready={ready} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 42%, transparent 0%, transparent 35%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.85) 100%)',
        }}
      />
    </div>
  );
}
