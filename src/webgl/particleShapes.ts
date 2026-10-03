/**
 * Deterministic point clouds for EduRoute cinematic morph.
 * Same particle count for every shape so we can lerp in place.
 */

function hash(i: number, seed = 1): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function fibSphere(i: number, n: number, radius: number): [number, number, number] {
  const y = 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return [Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius];
}

/** Scattered cloud */
export function shapeScatter(n: number, scale = 2.8): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = scale * Math.cbrt(hash(i, 1));
    const u = hash(i, 2) * Math.PI * 2;
    const v = Math.acos(2 * hash(i, 3) - 1);
    a[i * 3] = r * Math.sin(v) * Math.cos(u);
    a[i * 3 + 1] = r * Math.sin(v) * Math.sin(u) * 0.85;
    a[i * 3 + 2] = r * Math.cos(v);
  }
  return a;
}

/** Dual-hemisphere brain-like volume */
export function shapeBrain(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  const half = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const side = i < half ? -1 : 1;
    const j = i < half ? i : i - half;
    const nn = half;
    // Ellipsoid shell + surface noise
    const t = j / nn;
    const phi = t * Math.PI;
    const theta = (j * 2.399) % (Math.PI * 2);
    let rx = 0.55 + hash(j, 4) * 0.12;
    let ry = 0.42 + hash(j, 5) * 0.1;
    let rz = 0.48 + hash(j, 6) * 0.1;
    // Gyri-ish noise
    const nse = Math.sin(phi * 6 + theta * 4) * 0.06 + Math.sin(theta * 9) * 0.04;
    rx += nse;
    ry += nse * 0.7;
    const x = side * (0.12 + Math.sin(phi) * Math.cos(theta) * rx);
    const y = Math.cos(phi) * ry + 0.05;
    const z = Math.sin(phi) * Math.sin(theta) * rz;
    a[i * 3] = x;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = z;
  }
  return a;
}

/** Light bulb silhouette */
export function shapeBulb(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    if (t < 0.72) {
      // Glass sphere upper
      const k = t / 0.72;
      const [x, y, z] = fibSphere(Math.floor(k * n * 0.72), Math.floor(n * 0.72) || 1, 0.55);
      a[i * 3] = x;
      a[i * 3 + 1] = y * 0.9 + 0.25;
      a[i * 3 + 2] = z;
    } else if (t < 0.88) {
      // Neck
      const k = (t - 0.72) / 0.16;
      const ang = hash(i, 7) * Math.PI * 2;
      const r = 0.18 + hash(i, 8) * 0.04;
      a[i * 3] = Math.cos(ang) * r;
      a[i * 3 + 1] = -0.35 - k * 0.25;
      a[i * 3 + 2] = Math.sin(ang) * r;
    } else {
      // Base / screw
      const k = (t - 0.88) / 0.12;
      const ang = hash(i, 9) * Math.PI * 2;
      const r = 0.22;
      a[i * 3] = Math.cos(ang) * r;
      a[i * 3 + 1] = -0.62 - k * 0.2;
      a[i * 3 + 2] = Math.sin(ang) * r;
    }
  }
  return a;
}

/** Earth sphere */
export function shapeEarth(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = fibSphere(i, n, 0.72);
    // Slight continent noise
    const bump = 1 + (hash(i, 10) > 0.65 ? 0.04 : 0);
    a[i * 3] = x * bump;
    a[i * 3 + 1] = y * bump;
    a[i * 3 + 2] = z * bump;
  }
  return a;
}

/** Career network nodes + edges sampled as points */
export function shapeNetwork(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  const nodes = [
    [0, 0.2, 0],
    [-0.7, 0.5, 0.2],
    [0.7, 0.45, -0.15],
    [-0.5, -0.35, 0.35],
    [0.55, -0.3, 0.25],
    [0, 0.7, -0.3],
    [-0.3, 0, -0.55],
    [0.35, 0.1, 0.55],
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
    [1, 5], [2, 5], [3, 6], [4, 7], [1, 3], [2, 4],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    if (t < 0.25) {
      // Nodes
      const ni = Math.floor(hash(i, 11) * nodes.length) % nodes.length;
      const nd = nodes[ni];
      a[i * 3] = nd[0] + (hash(i, 12) - 0.5) * 0.08;
      a[i * 3 + 1] = nd[1] + (hash(i, 13) - 0.5) * 0.08;
      a[i * 3 + 2] = nd[2] + (hash(i, 14) - 0.5) * 0.08;
    } else {
      // Edge samples
      const ei = Math.floor(hash(i, 15) * edges.length) % edges.length;
      const [ia, ib] = edges[ei];
      const u = hash(i, 16);
      const A = nodes[ia];
      const B = nodes[ib];
      a[i * 3] = A[0] + (B[0] - A[0]) * u;
      a[i * 3 + 1] = A[1] + (B[1] - A[1]) * u;
      a[i * 3 + 2] = A[2] + (B[2] - A[2]) * u;
    }
  }
  return a;
}

/** Final EduRoute cluster — abstract mark */
export function shapeFinal(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    if (t < 0.5) {
      // Ring
      const ang = (i / (n * 0.5)) * Math.PI * 2;
      const r = 0.55 + (hash(i, 17) - 0.5) * 0.06;
      a[i * 3] = Math.cos(ang) * r;
      a[i * 3 + 1] = (hash(i, 18) - 0.5) * 0.12;
      a[i * 3 + 2] = Math.sin(ang) * r;
    } else {
      // Vertical route path
      const k = (t - 0.5) * 2;
      a[i * 3] = (hash(i, 19) - 0.5) * 0.15;
      a[i * 3 + 1] = -0.55 + k * 1.1;
      a[i * 3 + 2] = (hash(i, 20) - 0.5) * 0.15;
    }
  }
  return a;
}

export type ShapeName = 'scatter' | 'brain' | 'bulb' | 'earth' | 'network' | 'final';

export function buildAllShapes(n: number): Record<ShapeName, Float32Array> {
  return {
    scatter: shapeScatter(n),
    brain: shapeBrain(n),
    bulb: shapeBulb(n),
    earth: shapeEarth(n),
    network: shapeNetwork(n),
    final: shapeFinal(n),
  };
}

/** Master timeline progress → blend between two shapes */
export function morphTargets(progress: number): {
  from: ShapeName;
  to: ShapeName;
  t: number;
  cameraZ: number;
  rotY: number;
} {
  // 0–15 scatter→brain, 15–30 brain, 30–45 dissolve, 45–60 bulb,
  // 60–75 earth, 75–90 network, 90–100 final
  const p = Math.min(1, Math.max(0, progress));
  if (p < 0.15) {
    return { from: 'scatter', to: 'brain', t: p / 0.15, cameraZ: 3.2 - p * 4, rotY: p * 0.4 };
  }
  if (p < 0.3) {
    return { from: 'brain', to: 'brain', t: 1, cameraZ: 2.6 - (p - 0.15) * 2, rotY: 0.4 + (p - 0.15) * 2 };
  }
  if (p < 0.45) {
    return { from: 'brain', to: 'scatter', t: (p - 0.3) / 0.15, cameraZ: 2.3 + (p - 0.3) * 4, rotY: 0.7 };
  }
  if (p < 0.6) {
    return { from: 'scatter', to: 'bulb', t: (p - 0.45) / 0.15, cameraZ: 2.9 - (p - 0.45), rotY: 0.5 };
  }
  if (p < 0.75) {
    return { from: 'bulb', to: 'earth', t: (p - 0.6) / 0.15, cameraZ: 2.7, rotY: (p - 0.6) * 3 };
  }
  if (p < 0.9) {
    return { from: 'earth', to: 'network', t: (p - 0.75) / 0.15, cameraZ: 2.8, rotY: 0.3 };
  }
  return { from: 'network', to: 'final', t: (p - 0.9) / 0.1, cameraZ: 2.4 + (p - 0.9) * 2, rotY: 0.1 };
}
