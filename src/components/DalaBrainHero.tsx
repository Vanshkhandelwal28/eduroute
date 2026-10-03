/**
 * Faithful port of kekkorider/threejs-dala (Dala.ai WebGL module)
 * - brain.glb vertices → instanced micro-cubes
 * - custom vertex shader: distance(uPointer) → scale + rotate
 * - raycast on brain mesh · camera parallax
 * Assets: https://github.com/kekkorider/threejs-dala
 */
import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// CDN of original static/brain.glb from threejs-dala
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
  const brainRef = useRef<THREE.Mesh | null>(null);
  const { camera, size, pointer } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);
  const targetPoint = useRef(new THREE.Vector3());
  const smoothPoint = useRef(new THREE.Vector3());
  const hoverRef = useRef(0);
  const targetHover = useRef(0);
  const targetCam = useRef({ x: 0, y: 0 });

  const gltf = useGLTF(BRAIN_URL);

  const { count, material, geometry } = useMemo(() => {
    // Find first mesh with position attribute
    let brainMesh: THREE.Mesh | null = null;
    gltf.scene.traverse((obj) => {
      if (!brainMesh && (obj as THREE.Mesh).isMesh) {
        brainMesh = obj as THREE.Mesh;
      }
    });
    brainRef.current = brainMesh;

    const positions = brainMesh?.geometry?.attributes?.position;
    const count = positions ? positions.count : 2000;

    const geo = new THREE.BoxGeometry(0.004, 0.004, 0.004);
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

    geo.setAttribute('aRotation', new THREE.InstancedBufferAttribute(aRotation, 1));
    geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 1));
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      wireframe: true,
      uniforms: {
        uPointer: { value: new THREE.Vector3() },
        uHover: { value: 0 },
      },
    });

    return { count, material: mat, geometry: geo, brainMesh, positions };
  }, [gltf]);

  // Place instances on brain vertices (exactly like threejs-dala)
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !brainRef.current) return;

    const positions = brainRef.current.geometry.attributes.position;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      dummy.position.set(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i),
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, gltf]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Camera parallax (GSAP equivalent in threejs-dala)
    const x = pointer.x;
    const y = pointer.y;
    targetCam.current.x = x * 0.15;
    targetCam.current.y = y * 0.1;
    camera.position.x += (targetCam.current.x - camera.position.x) * 0.08;
    camera.position.y += (targetCam.current.y - camera.position.y) * 0.08;
    camera.position.z = size.width < 767 ? 2.3 : 1.2;
    camera.lookAt(0, 0, 0);

    // Raycast against brain
    mouse.set(pointer.x, pointer.y);
    raycaster.setFromCamera(mouse, camera);

    if (brainRef.current) {
      const hits = raycaster.intersectObject(brainRef.current);
      if (hits.length > 0 && hits[0]) {
        targetHover.current = ready ? 1 : 0;
        targetPoint.current.copy(hits[0].point);
      } else {
        targetHover.current = 0;
      }
    }

    // Smooth point + hover (GSAP duration ~0.25–0.3)
    smoothPoint.current.lerp(targetPoint.current, 0.15);
    hoverRef.current += (targetHover.current - hoverRef.current) * 0.12;

    const mat = mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uPointer.value.copy(smoothPoint.current);
    mat.uniforms.uHover.value = hoverRef.current * (ready ? 1 : 0);
  });

  // Invisible brain for raycasting only (not rendered)
  return (
    <>
      {brainRef.current && (
        <mesh
          geometry={brainRef.current.geometry}
          visible={false}
          raycast={brainRef.current.raycast.bind(brainRef.current)}
        >
          <meshBasicMaterial />
        </mesh>
      )}
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, count]}
        frustumCulled={false}
      />
    </>
  );
}

function Scene({ ready }: { ready: boolean }) {
  return (
    <Suspense fallback={null}>
      <BrainInstances ready={ready} />
    </Suspense>
  );
}

// Preload GLB
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
      <Canvas
        camera={{ position: [0, 0, 1.2], fov: 75, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
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
            'radial-gradient(ellipse 75% 65% at 50% 42%, transparent 0%, transparent 28%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.9) 100%)',
        }}
      />
    </div>
  );
}
