/**
 * Full port of kekkorider/threejs-dala
 * Interactive: raycast brain + continuous pointer field
 * Background: radial #692a84 → #3c184c (upstream index.scss)
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
  float c = smoothstep(0.55, 0.08, d);

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
  const hitMeshRef = useRef<THREE.Mesh>(null);
  const { camera, size, pointer, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const planeHit = useMemo(() => new THREE.Vector3(), []);
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

  const brainGeo = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    gltf.scene.traverse((obj) => {
      if (!mesh && (obj as THREE.Mesh).isMesh) mesh = obj as THREE.Mesh;
    });
    return mesh?.geometry ?? null;
  }, [gltf]);

  const { count, boxGeo } = useMemo(() => {
    if (!brainGeo) return { count: 0, boxGeo: new THREE.BoxGeometry(0.004, 0.004, 0.004) };

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

  // Place cubes on brain vertices
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

    // Camera parallax (threejs-dala)
    targetCam.current.x = pointer.x * 0.15;
    targetCam.current.y = pointer.y * 0.1;
    camera.position.x += (targetCam.current.x - camera.position.x) * 0.1;
    camera.position.y += (targetCam.current.y - camera.position.y) * 0.1;
    camera.position.z = size.width < 767 ? 2.3 : 1.2;
    camera.lookAt(0, 0, 0);

    mouse.set(pointer.x, pointer.y);
    raycaster.setFromCamera(mouse, camera);

    // 1) Raycast invisible brain mesh (in scene)
    let hitBrain = false;
    if (hitMeshRef.current && ready) {
      const hits = raycaster.intersectObject(hitMeshRef.current, false);
      if (hits.length > 0 && hits[0]) {
        hitBrain = true;
        targetPoint.current.copy(hits[0].point);
        targetHover.current = 1;
      }
    }

    // 2) Fallback: project pointer onto z≈0 plane so particles always react to mouse
    if (!hitBrain) {
      raycaster.ray.intersectPlane(plane, planeHit);
      if (planeHit) {
        targetPoint.current.lerp(planeHit, 1);
        // Soft hover when pointer is near the brain volume
        const distFromCenter = Math.sqrt(
          planeHit.x * planeHit.x + planeHit.y * planeHit.y,
        );
        targetHover.current = ready
          ? THREE.MathUtils.clamp(1.2 - distFromCenter * 1.4, 0.15, 0.85)
          : 0;
      } else {
        targetHover.current = ready ? 0.2 : 0;
      }
    }

    smoothPoint.current.lerp(targetPoint.current, 0.2);
    hoverRef.current += (targetHover.current - hoverRef.current) * 0.14;

    uniforms.uPointer.value.copy(smoothPoint.current);
    uniforms.uHover.value = hoverRef.current;
  });

  // Keep canvas receiving events
  useEffect(() => {
    gl.domElement.style.touchAction = 'none';
  }, [gl]);

  if (count === 0 || !brainGeo) return null;

  return (
    <>
      {/* Invisible hit target — must be in the scene for reliable raycast */}
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

function Scene({ ready }: { ready: boolean }) {
  return (
    <Suspense fallback={null}>
      <BrainInstances ready={ready} />
    </Suspense>
  );
}

useGLTF.preload(BRAIN_URL);

/** Dala replica background (index.scss) */
const DALA_BG =
  'radial-gradient(circle at 50% 45%, #692a84 0%, #3c184c 55%, #1a0a22 100%)';

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
    return <div className="absolute inset-0 z-0" style={{ background: DALA_BG }} />;
  }

  return (
    <div className="absolute inset-0 z-0" style={{ background: DALA_BG }}>
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
        // Events on full canvas area
        eventSource={typeof document !== 'undefined' ? document.documentElement : undefined}
        eventPrefix="client"
      >
        <Scene ready={ready} />
      </Canvas>
      {/* Soft vignette only — keep purple visible */}
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
