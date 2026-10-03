/**
 * Phase 6 — Reusable procedural shape generator.
 * All shapes return exactly `count` particles (xyz Float32Array).
 */

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

/** Fibonacci sphere direction for index i of count. */
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
 * Organic brain — two hemispheres, folds, asymmetric volume.
 */
export function createBrain(count) {
  const positions = new Float32Array(count * 3);
  const scaleX = 1.15;
  const scaleY = 0.95;
  const scaleZ = 1.35;

  for (let i = 0; i < count; i++) {
    let { x, y, z } = fibDirection(i, count);

    const n1 = noise3(x * 2.2, y * 2.2, z * 2.2);
    const n2 = noise3(x * 5.5 + 1.3, y * 5.5, z * 5.5 - 0.7);
    const n3 = noise3(x * 11.0, y * 11.0 + 2.1, z * 11.0);
    const fold = 0.18 * n1 + 0.09 * n2 + 0.04 * n3;

    // Two connected hemispheres — gap-ish sulcus near x=0
    const hemisphere = Math.sign(x || 0.001) * 0.06 * Math.abs(x);
    const sulcus = -0.04 * Math.exp(-x * x * 8.0);

    const radius = 1.0 + fold + hemisphere + sulcus;

    x *= radius * scaleX;
    y *= radius * scaleY;
    z *= radius * scaleZ;
    y += 0.08;

    x += (hash(i * 0.137 + 19.7) - 0.5) * 0.04;
    y += (hash(i * 0.271 + 3.1) - 0.5) * 0.03;
    z += (hash(i * 0.419 + 7.9) - 0.5) * 0.04;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
}

/**
 * Light-bulb / idea — spherical head, narrowing neck, small base.
 */
export function createBulb(count) {
  const positions = new Float32Array(count * 3);

  // Partition particles: ~70% globe, ~20% neck, ~10% base
  const nGlobe = Math.floor(count * 0.7);
  const nNeck = Math.floor(count * 0.2);
  const nBase = count - nGlobe - nNeck;

  let idx = 0;

  // Upper sphere (slightly flattened, organic)
  for (let i = 0; i < nGlobe; i++) {
    let { x, y, z } = fibDirection(i, nGlobe);
    // Only upper hemisphere-ish + full sphere for volume
    const r = 0.85 + noise3(x * 3, y * 3, z * 3) * 0.06;
    x *= r;
    y = y * r * 0.95 + 0.55; // lift up
    z *= r;

    x += (hash(i * 0.2) - 0.5) * 0.03;
    z += (hash(i * 0.31) - 0.5) * 0.03;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  }

  // Neck — tapering cylinder
  for (let i = 0; i < nNeck; i++) {
    const t = i / Math.max(nNeck - 1, 1); // 0 top → 1 bottom
    const angle = hash(i * 0.7) * Math.PI * 2;
    const radius = 0.28 * (1.0 - t * 0.55) + (hash(i * 1.1) - 0.5) * 0.04;
    const y = 0.55 - t * 0.75; // from bottom of globe down

    positions[idx * 3] = Math.cos(angle) * radius;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = Math.sin(angle) * radius;
    idx++;
  }

  // Base — flat disc
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
 * Globe — spherical with subtle lat/long structure + irregularity.
 */
export function createGlobe(count) {
  const positions = new Float32Array(count * 3);
  const R = 1.05;

  for (let i = 0; i < count; i++) {
    let { x, y, z } = fibDirection(i, count);

    // Latitude bands emphasis (slight clustering)
    const lat = Math.asin(Math.max(-1, Math.min(1, y)));
    const band = Math.sin(lat * 6.0) * 0.025;

    // Longitude ridges
    const lon = Math.atan2(z, x);
    const ridge = Math.sin(lon * 8.0) * 0.02;

    const n = noise3(x * 4, y * 4, z * 4) * 0.035;
    const radius = R + band + ridge + n;

    x *= radius;
    y *= radius;
    z *= radius;

    x += (hash(i * 0.41) - 0.5) * 0.025;
    y += (hash(i * 0.53) - 0.5) * 0.025;
    z += (hash(i * 0.67) - 0.5) * 0.025;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
}

/**
 * Abstract neural network — nodes + connecting paths + center.
 */
export function createNetwork(count) {
  const positions = new Float32Array(count * 3);

  // Node centers
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
  // Central hub
  nodes.push({ x: 0, y: 0, z: 0 });

  const nNodes = nodes.length;
  // ~25% on nodes, ~15% center cloud, rest on edges
  const perNode = Math.floor((count * 0.25) / nNodes);
  const centerCloud = Math.floor(count * 0.12);
  let idx = 0;

  // Particles clustered at nodes
  for (let n = 0; n < nNodes; n++) {
    const node = nodes[n];
    const num = n === nNodes - 1 ? centerCloud : perNode;
    for (let j = 0; j < num && idx < count; j++) {
      const u = hash(idx * 0.17 + n);
      const v = hash(idx * 0.31 + n * 2);
      const w = hash(idx * 0.47 + n * 3);
      const rad = 0.12 * Math.cbrt(u); // denser center
      const theta = v * Math.PI * 2;
      const phi = Math.acos(2 * w - 1);

      positions[idx * 3] = node.x + rad * Math.sin(phi) * Math.cos(theta);
      positions[idx * 3 + 1] = node.y + rad * Math.sin(phi) * Math.sin(theta);
      positions[idx * 3 + 2] = node.z + rad * Math.cos(phi);
      idx++;
    }
  }

  // Connecting paths between nodes (and to center)
  const edges = [];
  for (let n = 0; n < nodeCount; n++) {
    edges.push([n, nodeCount]); // to center
    edges.push([n, (n + 1) % nodeCount]); // ring
    if (n % 2 === 0) edges.push([n, (n + 3) % nodeCount]); // chords
  }

  const remaining = count - idx;
  const perEdge = Math.floor(remaining / edges.length);

  for (let e = 0; e < edges.length; e++) {
    const [a, b] = edges[e];
    const na = nodes[a];
    const nb = nodes[b];
    const num = e === edges.length - 1 ? count - idx : perEdge;

    for (let j = 0; j < num && idx < count; j++) {
      const t = j / Math.max(num - 1, 1);
      // Slight curve via midpoint offset
      const mid = {
        x: (na.x + nb.x) * 0.5,
        y: (na.y + nb.y) * 0.5 + 0.08,
        z: (na.z + nb.z) * 0.5,
      };
      // Quadratic bezier
      const omt = 1 - t;
      let x = omt * omt * na.x + 2 * omt * t * mid.x + t * t * nb.x;
      let y = omt * omt * na.y + 2 * omt * t * mid.y + t * t * nb.y;
      let z = omt * omt * na.z + 2 * omt * t * mid.z + t * t * nb.z;

      // Tube thickness
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

  // Fill any leftover
  while (idx < count) {
    const { x, y, z } = fibDirection(idx, count);
    positions[idx * 3] = x * 0.3;
    positions[idx * 3 + 1] = y * 0.3;
    positions[idx * 3 + 2] = z * 0.3;
    idx++;
  }

  return positions;
}

export const SHAPE_NAMES = ['brain', 'bulb', 'globe', 'network'];

/**
 * Generate all shapes for a given count.
 * @returns {{ brain, bulb, globe, network }}
 */
export function generateAllShapes(count) {
  return {
    brain: createBrain(count),
    bulb: createBulb(count),
    globe: createGlobe(count),
    network: createNetwork(count),
  };
}

/** Responsive particle count (same as before). */
export function getParticleCount() {
  if (typeof window === 'undefined') return 12000;
  const w = window.innerWidth;
  if (w < 640) return 3072;
  if (w < 1024) return 6144;
  return 14000;
}

// Back-compat alias used by Particles
export function createBrainShape(count) {
  return createBrain(count);
}
