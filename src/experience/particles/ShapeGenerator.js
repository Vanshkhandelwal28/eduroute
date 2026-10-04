/**
 * Procedural volumetric shapes — denser interior + organic surface.
 * Brain + Globe hardened for clear silhouettes matching live Dala.
 */

import { getParticleCount as deviceParticleCount } from '../utils/device.js';

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function noise3(x, y, z) {
  return (
    Math.sin(x * 1.7 + y * 2.3 + z * 1.1) * 0.5 +
    Math.sin(x * 3.1 - y * 1.9 + z * 2.7) * 0.25 +
    Math.sin(x * 5.3 + y * 4.1 - z * 3.2) * 0.125
  );
}

function fibDirection(i, count) {
  const t = i / count;
  const inclination = Math.acos(1 - 2 * t);
  const azimuth = Math.PI * (1 + Math.sqrt(5)) * i;
  return {
    x: Math.sin(inclination) * Math.cos(azimuth),
    y: Math.cos(inclination),
    z: Math.sin(inclination) * Math.sin(azimuth),
  };
}

/**
 * Uniform scatter cloud — used for "chaos / knowledge fragments".
 */
export function createScatter(count) {
  const positions = new Float32Array(count * 3);
  const R = 2.4;

  for (let i = 0; i < count; i++) {
    let { x, y, z } = fibDirection(i, count);
    const u = hash(i * 0.73 + 1.1);
    const r = Math.cbrt(u) * R;
    const n = noise3(x * 2.1, y * 2.1, z * 2.1) * 0.12;
    positions[i * 3] = x * (r + n);
    positions[i * 3 + 1] = y * (r + n) * 0.85;
    positions[i * 3 + 2] = z * (r + n);
  }
  return positions;
}

/**
 * Volumetric brain with clear silhouette:
 * - Deep longitudinal fissure (midline split)
 * - Distinct left / right hemispheres
 * - Cerebellum bulge (rear-bottom)
 * - Subtle brainstem taper at bottom
 * - Cortical folds via multi-octave noise
 */
export function createBrain(count) {
  const positions = new Float32Array(count * 3);

  // Aspect: wider left-right, elongated front-back, slightly flattened top
  const scaleX = 1.28;
  const scaleY = 0.92;
  const scaleZ = 1.48;

  // More surface for sharp outline, less interior fill
  const nSurface = Math.floor(count * 0.68);
  const nVolume = count - nSurface;

  for (let i = 0; i < nSurface; i++) {
    let { x, y, z } = fibDirection(i, nSurface);

    // ── Multi-octave cortical folds ──────────────────────────────
    const n1 = noise3(x * 2.4, y * 2.4, z * 2.4);
    const n2 = noise3(x * 6.0 + 1.3, y * 6.0, z * 6.0 - 0.7);
    const n3 = noise3(x * 12.0, y * 12.0 + 2.1, z * 12.0);
    const fold = 0.16 * n1 + 0.09 * n2 + 0.04 * n3;

    // ── Deep longitudinal fissure (midline sulcus) ───────────────
    // Strong inward pull near x≈0 so the two hemispheres separate clearly
    const fissure = -0.14 * Math.exp(-x * x * 18.0);

    // ── Hemisphere outward push ──────────────────────────────────
    // Push each side further out so left/right read as two lobes
    const hemiPush = Math.sign(x || 0.001) * 0.11 * Math.abs(x);

    // ── Cerebellum bulge (rear-bottom, z>0 & y low) ──────────────
    const cereY = Math.max(0, -y + 0.15);
    const cereZ = Math.max(0, z);
    const cerebellum = 0.12 * cereY * cereZ * cereZ;

    // ── Brainstem taper (bottom center) ──────────────────────────
    // Pull bottom-center slightly down and in for a stem silhouette
    const stemMask = Math.exp(-(x * x * 6 + z * z * 4)) * Math.max(0, -y);
    const stemY = -0.08 * stemMask;
    const stemIn = -0.04 * stemMask;

    // ── Frontal lobe slight forward bias ─────────────────────────
    const frontal = Math.max(0, -z) * 0.04;

    let radius = 1.0 + fold + fissure + hemiPush + cerebellum + frontal;

    x *= radius * scaleX;
    y *= radius * scaleY;
    z *= radius * scaleZ;

    // Apply stem offset after scaling
    y += 0.06 + stemY;
    x *= 1.0 + stemIn;
    z *= 1.0 + stemIn * 0.5;

    // Tiny jitter so sampling isn't perfectly regular
    x += (hash(i * 0.137 + 19.7) - 0.5) * 0.022;
    y += (hash(i * 0.271 + 3.1) - 0.5) * 0.018;
    z += (hash(i * 0.419 + 7.9) - 0.5) * 0.022;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  // Interior volume — denser near cortex, thinner at center
  for (let j = 0; j < nVolume; j++) {
    const i = nSurface + j;
    let { x, y, z } = fibDirection(j * 3 + 7, nVolume * 3);

    const u = hash(j * 0.91 + 2.3);
    // Bias toward outer shell (0.45–0.85) so silhouette stays dense
    const r = 0.45 + Math.cbrt(u) * 0.4;

    const n1 = noise3(x * 3.1, y * 3.1, z * 3.1) * 0.06;
    const hemi = Math.sign(x || 0.001) * 0.05 * Math.abs(x);
    const fissure = -0.08 * Math.exp(-x * x * 14.0);

    x *= (r + n1 + hemi + fissure) * scaleX;
    y *= (r + n1) * scaleY;
    z *= (r + n1) * scaleZ;
    y += 0.05;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

export function createBulb(count) {
  const positions = new Float32Array(count * 3);
  const nGlobe = Math.floor(count * 0.55);
  const nInterior = Math.floor(count * 0.15);
  const nNeck = Math.floor(count * 0.18);
  const nBase = count - nGlobe - nInterior - nNeck;
  let idx = 0;

  for (let i = 0; i < nGlobe; i++) {
    let { x, y, z } = fibDirection(i, nGlobe);
    const r = 0.88 + noise3(x * 3, y * 3, z * 3) * 0.06;
    x *= r;
    y = y * r * 0.95 + 0.55;
    z *= r;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  }

  for (let i = 0; i < nInterior; i++) {
    let { x, y, z } = fibDirection(i + 11, nInterior);
    const r = Math.cbrt(hash(i * 0.7)) * 0.55;
    x *= r;
    y = y * r + 0.55;
    z *= r;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  }

  for (let i = 0; i < nNeck; i++) {
    const t = i / Math.max(nNeck - 1, 1);
    const angle = hash(i * 0.7) * Math.PI * 2;
    const radius = 0.28 * (1.0 - t * 0.55) + (hash(i * 1.1) - 0.5) * 0.04;
    const y = 0.55 - t * 0.75;
    positions[idx * 3] = Math.cos(angle) * radius;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = Math.sin(angle) * radius;
    idx++;
  }

  for (let i = 0; i < nBase; i++) {
    const angle = (i / nBase) * Math.PI * 2 + hash(i) * 0.5;
    const r = Math.sqrt(hash(i * 0.9)) * 0.42;
    const y = -0.22 + (hash(i * 1.3) - 0.5) * 0.04;
    positions[idx * 3] = Math.cos(angle) * r;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = Math.sin(angle) * r;
    idx++;
  }

  return positions;
}

/**
 * Globe with readable continental landmasses.
 * Land is raised; ocean basins pulled slightly inward so continents
 * read as distinct shapes (Africa, Eurasia, Americas, Australia).
 */
export function createGlobe(count) {
  const positions = new Float32Array(count * 3);
  const nSurface = Math.floor(count * 0.78);
  const nVolume = count - nSurface;
  const R = 1.12;

  /**
   * Continental height field in lat/lon space.
   * Returns positive for land, near-zero / negative for ocean.
   * Approximate real-world placement (lon: -π..π, lat: -π/2..π/2).
   */
  function continentHeight(lon, lat) {
    let h = 0;

    // Africa — broad oval centered ~lon 20°, lat 5°
    {
      const dlon = lon - 0.35;
      const dlat = lat - 0.08;
      const af = Math.exp(-(dlon * dlon * 2.8 + dlat * dlat * 3.5));
      h += af * 0.09;
    }

    // Eurasia — wide band lon 20°..140°, lat 20°..60°
    {
      const dlon = lon - 1.4;
      const dlat = lat - 0.7;
      const eu = Math.exp(-(dlon * dlon * 0.9 + dlat * dlat * 4.5));
      h += eu * 0.07;
    }

    // North America — lon -100°, lat 40°
    {
      const dlon = lon + 1.75;
      const dlat = lat - 0.7;
      const na = Math.exp(-(dlon * dlon * 2.2 + dlat * dlat * 3.0));
      h += na * 0.075;
    }

    // South America — lon -60°, lat -15°
    {
      const dlon = lon + 1.05;
      const dlat = lat + 0.25;
      const sa = Math.exp(-(dlon * dlon * 4.0 + dlat * dlat * 2.2));
      h += sa * 0.08;
    }

    // Australia — lon 135°, lat -25°
    {
      const dlon = lon - 2.35;
      const dlat = lat + 0.45;
      const au = Math.exp(-(dlon * dlon * 5.5 + dlat * dlat * 6.0));
      h += au * 0.065;
    }

    // Antarctica band (bottom)
    if (lat < -1.0) {
      h += 0.04 * Math.max(0, -lat - 1.0);
    }

    // Soft ocean depression so land stands out
    const ocean = -0.025 * (1.0 - Math.min(1, h * 12));

    // Fine coastal noise
    const coast = noise3(lon * 3.5, lat * 3.5, 0.5) * 0.012;

    return h + ocean + coast;
  }

  for (let i = 0; i < nSurface; i++) {
    let { x, y, z } = fibDirection(i, nSurface);

    const lat = Math.asin(Math.max(-1, Math.min(1, y)));
    const lon = Math.atan2(z, x);

    const land = continentHeight(lon, lat);

    // Subtle latitude banding (climate / cloud bands)
    const band = Math.sin(lat * 5.0) * 0.012;

    // Ridge noise for mountain-ish texture on land
    const ridge =
      land > 0.02
        ? noise3(x * 5.5, y * 5.5, z * 5.5) * 0.02
        : noise3(x * 3.0, y * 3.0, z * 3.0) * 0.008;

    const radius = R + land + band + ridge;

    positions[i * 3] = x * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = z * radius;
  }

  // Sparse interior so the sphere doesn't look hollow but silhouette stays crisp
  for (let j = 0; j < nVolume; j++) {
    const i = nSurface + j;
    let { x, y, z } = fibDirection(j + 5, nVolume);
    const r = Math.cbrt(hash(j * 1.1)) * 0.78;
    positions[i * 3] = x * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = z * r;
  }

  return positions;
}

export function createNetwork(count) {
  const positions = new Float32Array(count * 3);
  const nodeCount = 9;
  const nodes = [];
  for (let n = 0; n < nodeCount; n++) {
    const a = (n / nodeCount) * Math.PI * 2;
    const elev = (hash(n * 2.1) - 0.5) * 1.2;
    const r = 0.7 + hash(n * 3.3) * 0.45;
    nodes.push({
      x: Math.cos(a) * r,
      y: elev,
      z: Math.sin(a) * r * 0.9,
    });
  }
  nodes.push({ x: 0, y: 0, z: 0 });

  const nNodes = nodes.length;
  const perNode = Math.floor((count * 0.28) / nNodes);
  const centerCloud = Math.floor(count * 0.14);
  let idx = 0;

  for (let n = 0; n < nNodes; n++) {
    const node = nodes[n];
    const num = n === nNodes - 1 ? centerCloud : perNode;
    for (let j = 0; j < num && idx < count; j++) {
      const u = hash(idx * 0.17 + n);
      const v = hash(idx * 0.31 + n * 2);
      const w = hash(idx * 0.47 + n * 3);
      const rad = 0.14 * Math.cbrt(u);
      const theta = v * Math.PI * 2;
      const phi = Math.acos(2 * w - 1);
      positions[idx * 3] = node.x + rad * Math.sin(phi) * Math.cos(theta);
      positions[idx * 3 + 1] = node.y + rad * Math.sin(phi) * Math.sin(theta);
      positions[idx * 3 + 2] = node.z + rad * Math.cos(phi);
      idx++;
    }
  }

  const edges = [];
  for (let n = 0; n < nodeCount; n++) {
    edges.push([n, nodeCount]);
    edges.push([n, (n + 1) % nodeCount]);
    if (n % 2 === 0) edges.push([n, (n + 3) % nodeCount]);
  }

  const remaining = count - idx;
  const perEdge = Math.floor(remaining / Math.max(edges.length, 1));

  for (let e = 0; e < edges.length; e++) {
    const [a, b] = edges[e];
    const na = nodes[a];
    const nb = nodes[b];
    const num = e === edges.length - 1 ? count - idx : perEdge;

    for (let j = 0; j < num && idx < count; j++) {
      const t = j / Math.max(num - 1, 1);
      const midX = (na.x + nb.x) * 0.5;
      const midY = (na.y + nb.y) * 0.5 + 0.08;
      const midZ = (na.z + nb.z) * 0.5;
      const omt = 1 - t;
      let x = omt * omt * na.x + 2 * omt * t * midX + t * t * nb.x;
      let y = omt * omt * na.y + 2 * omt * t * midY + t * t * nb.y;
      let z = omt * omt * na.z + 2 * omt * t * midZ + t * t * nb.z;
      const spread = 0.03 + hash(idx * 0.9) * 0.04;
      x += (hash(idx * 1.1) - 0.5) * spread;
      y += (hash(idx * 1.3) - 0.5) * spread;
      z += (hash(idx * 1.7) - 0.5) * spread;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;
      idx++;
    }
  }

  while (idx < count) {
    const { x, y, z } = fibDirection(idx, count);
    positions[idx * 3] = x * 0.3;
    positions[idx * 3 + 1] = y * 0.3;
    positions[idx * 3 + 2] = z * 0.3;
    idx++;
  }

  return positions;
}

/**
 * Abstract organic ribbon / twisted form — used at Team / CTA.
 */
export function createAbstract(count) {
  const positions = new Float32Array(count * 3);
  const nSurface = Math.floor(count * 0.72);
  const nVolume = count - nSurface;

  for (let i = 0; i < nSurface; i++) {
    const t = i / Math.max(nSurface - 1, 1);
    const angle = t * Math.PI * 4.2;
    const twist = t * Math.PI * 2.6;
    const radius = 0.55 + 0.35 * Math.sin(t * Math.PI * 3);
    const elev = (t - 0.5) * 2.1;

    const cx = Math.cos(angle) * radius;
    const cy = elev + Math.sin(twist) * 0.18;
    const cz = Math.sin(angle) * radius * 0.85;

    const tubeR = 0.22 + noise3(cx * 2, cy * 2, cz * 2) * 0.06;
    const { x: dx, y: dy, z: dz } = fibDirection(i * 3 + 11, nSurface * 2);
    const ox = dx * tubeR * 0.55;
    const oy = dy * tubeR * 1.15;
    const oz = dz * tubeR * 0.55;

    positions[i * 3] = cx + ox;
    positions[i * 3 + 1] = cy + oy;
    positions[i * 3 + 2] = cz + oz;
  }

  for (let j = 0; j < nVolume; j++) {
    const i = nSurface + j;
    const t = hash(j * 0.61);
    const angle = t * Math.PI * 4.2;
    const radius = 0.55 + 0.35 * Math.sin(t * Math.PI * 3);
    const elev = (t - 0.5) * 2.1;
    const r = Math.cbrt(hash(j * 1.3)) * 0.35;

    const { x, y, z } = fibDirection(j + 19, nVolume);
    positions[i * 3] = Math.cos(angle) * radius + x * r;
    positions[i * 3 + 1] = elev + y * r * 0.8;
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.85 + z * r;
  }

  return positions;
}

/** Optional hard geometric pyramid for CTA accent */
export function createPyramid(count) {
  const positions = new Float32Array(count * 3);
  const apex = { x: 0, y: 1.15, z: 0 };
  const base = [
    { x: -0.95, y: -0.55, z: -0.95 },
    { x: 0.95, y: -0.55, z: -0.95 },
    { x: 0.95, y: -0.55, z: 0.95 },
    { x: -0.95, y: -0.55, z: 0.95 },
  ];
  const faces = [
    [apex, base[0], base[1]],
    [apex, base[1], base[2]],
    [apex, base[2], base[3]],
    [apex, base[3], base[0]],
    [base[0], base[1], base[2]],
    [base[0], base[2], base[3]],
  ];

  const nSurface = Math.floor(count * 0.78);
  const nVolume = count - nSurface;

  for (let i = 0; i < nSurface; i++) {
    const face = faces[i % faces.length];
    let u = hash(i * 0.37 + 1.1);
    let v = hash(i * 0.59 + 2.3);
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    positions[i * 3] =
      face[0].x * w + face[1].x * u + face[2].x * v;
    positions[i * 3 + 1] =
      face[0].y * w + face[1].y * u + face[2].y * v;
    positions[i * 3 + 2] =
      face[0].z * w + face[1].z * u + face[2].z * v;
  }

  for (let j = 0; j < nVolume; j++) {
    const i = nSurface + j;
    const u = hash(j * 0.71);
    const v = hash(j * 0.93);
    const w = hash(j * 1.17);
    const s = Math.cbrt(u);
    const bx = (base[0].x + base[1].x + base[2].x + base[3].x) * 0.25;
    const by = base[0].y;
    const bz = (base[0].z + base[1].z + base[2].z + base[3].z) * 0.25;
    positions[i * 3] = bx + (apex.x - bx) * s + (v - 0.5) * 0.5 * (1 - s);
    positions[i * 3 + 1] = by + (apex.y - by) * s;
    positions[i * 3 + 2] = bz + (apex.z - bz) * s + (w - 0.5) * 0.5 * (1 - s);
  }

  return positions;
}

export const SHAPE_NAMES = [
  'scatter',
  'brain',
  'bulb',
  'globe',
  'network',
  'abstract',
  'pyramid',
];

export function generateAllShapes(count) {
  return {
    scatter: createScatter(count),
    brain: createBrain(count),
    bulb: createBulb(count),
    globe: createGlobe(count),
    network: createNetwork(count),
    abstract: createAbstract(count),
    pyramid: createPyramid(count),
  };
}

export function getParticleCount() {
  return deviceParticleCount();
}

export function createBrainShape(count) {
  return createBrain(count);
}
