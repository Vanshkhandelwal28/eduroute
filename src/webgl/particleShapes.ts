/**
 * Deterministic point clouds — same index i maps across all shapes
 * for continuous river-like morphs (no particle identity jumps).
 */

function hash(i: number, seed = 1): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function fibSphere(i: number, n: number, radius: number): [number, number, number] {
  const y = n <= 1 ? 0 : 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return [Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius];
}

/** Same particle index → coherent path across shapes */
export function shapeScatter(n: number, scale = 2.4): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = fibSphere(i, n, scale * (0.55 + hash(i, 1) * 0.45));
    a[i * 3] = x;
    a[i * 3 + 1] = y * 0.85;
    a[i * 3 + 2] = z;
  }
  return a;
}

export function shapeBrain(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // Deterministic from index (not half-split) so i matches other shapes
    const side = hash(i, 2) > 0.5 ? 1 : -1;
    const phi = (i / n) * Math.PI;
    const theta = i * 2.399963;
    let rx = 0.55 + hash(i, 4) * 0.1;
    let ry = 0.42 + hash(i, 5) * 0.08;
    let rz = 0.48 + hash(i, 6) * 0.08;
    const nse = Math.sin(phi * 6 + theta * 4) * 0.05 + Math.sin(theta * 9) * 0.03;
    rx += nse;
    ry += nse * 0.7;
    a[i * 3] = side * (0.1 + Math.sin(phi) * Math.cos(theta) * rx);
    a[i * 3 + 1] = Math.cos(phi) * ry + 0.04;
    a[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * rz;
  }
  return a;
}

export function shapeBulb(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    if (t < 0.72) {
      const [x, y, z] = fibSphere(i, Math.max(1, Math.floor(n * 0.72)), 0.52);
      a[i * 3] = x;
      a[i * 3 + 1] = y * 0.9 + 0.22;
      a[i * 3 + 2] = z;
    } else if (t < 0.88) {
      const k = (t - 0.72) / 0.16;
      const ang = hash(i, 7) * Math.PI * 2;
      const r = 0.16 + hash(i, 8) * 0.04;
      a[i * 3] = Math.cos(ang) * r;
      a[i * 3 + 1] = -0.32 - k * 0.22;
      a[i * 3 + 2] = Math.sin(ang) * r;
    } else {
      const k = (t - 0.88) / 0.12;
      const ang = hash(i, 9) * Math.PI * 2;
      a[i * 3] = Math.cos(ang) * 0.2;
      a[i * 3 + 1] = -0.58 - k * 0.18;
      a[i * 3 + 2] = Math.sin(ang) * 0.2;
    }
  }
  return a;
}

export function shapeEarth(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = fibSphere(i, n, 0.7);
    const bump = 1 + (hash(i, 10) > 0.7 ? 0.035 : 0);
    a[i * 3] = x * bump;
    a[i * 3 + 1] = y * bump;
    a[i * 3 + 2] = z * bump;
  }
  return a;
}

export function shapeNetwork(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  const nodes = [
    [0, 0.15, 0],
    [-0.65, 0.45, 0.18],
    [0.65, 0.4, -0.12],
    [-0.48, -0.32, 0.3],
    [0.5, -0.28, 0.22],
    [0, 0.65, -0.25],
    [-0.28, 0, -0.5],
    [0.32, 0.08, 0.5],
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
    [1, 5], [2, 5], [3, 6], [4, 7], [1, 3], [2, 4],
  ];
  for (let i = 0; i < n; i++) {
    if (i / n < 0.22) {
      const ni = i % nodes.length;
      const nd = nodes[ni];
      a[i * 3] = nd[0] + (hash(i, 12) - 0.5) * 0.06;
      a[i * 3 + 1] = nd[1] + (hash(i, 13) - 0.5) * 0.06;
      a[i * 3 + 2] = nd[2] + (hash(i, 14) - 0.5) * 0.06;
    } else {
      const ei = i % edges.length;
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

export function shapeFinal(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    if (t < 0.55) {
      const ang = (i / Math.max(1, n * 0.55)) * Math.PI * 2;
      const r = 0.52 + (hash(i, 17) - 0.5) * 0.05;
      a[i * 3] = Math.cos(ang) * r;
      a[i * 3 + 1] = (hash(i, 18) - 0.5) * 0.1;
      a[i * 3 + 2] = Math.sin(ang) * r;
    } else {
      const k = (t - 0.55) / 0.45;
      a[i * 3] = (hash(i, 19) - 0.5) * 0.12;
      a[i * 3 + 1] = -0.5 + k * 1.0;
      a[i * 3 + 2] = (hash(i, 20) - 0.5) * 0.12;
    }
  }
  return a;
}

export type ShapeName = 'scatter' | 'brain' | 'bulb' | 'earth' | 'network' | 'final';

export const SHAPE_ORDER: ShapeName[] = [
  'scatter',
  'brain',
  'bulb',
  'earth',
  'network',
  'final',
];

/** Keyframe stops along scroll 0–1 (overlapping blends = river flow) */
export const KEYFRAME_STOPS = [0, 0.18, 0.38, 0.55, 0.72, 0.88, 1];

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

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

/**
 * Continuous blend: always between two adjacent keyframes with smoothstep.
 * No hard resets — progress maps to a single flowing path.
 */
export function morphTargets(progress: number): {
  from: ShapeName;
  to: ShapeName;
  t: number;
  cameraZ: number;
  rotY: number;
} {
  const p = Math.min(1, Math.max(0, progress));
  const stops = KEYFRAME_STOPS;
  const names = SHAPE_ORDER;

  let seg = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i] && p <= stops[i + 1]) {
      seg = i;
      break;
    }
    if (p > stops[i]) seg = i;
  }
  const a = stops[seg];
  const b = stops[Math.min(seg + 1, stops.length - 1)];
  const t = smoothstep(a, b, p);
  const from = names[Math.min(seg, names.length - 1)];
  const to = names[Math.min(seg + 1, names.length - 1)];

  const cameraZ = 3.1 - p * 0.7;
  const rotY = p * Math.PI * 0.35;

  return { from, to, t, cameraZ, rotY };
}
