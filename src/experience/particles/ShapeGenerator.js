/**
 * Procedural volumetric shapes — denser interior + organic surface.
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
 * Volumetric brain — surface shell + interior fill for density.
 * ~60% surface, ~40% volume sample.
 */
export function createBrain(count) {
  const positions = new Float32Array(count * 3);
  const scaleX = 1.2;
  const scaleY = 0.95;
  const scaleZ = 1.4;

  const nSurface = Math.floor(count * 0.58);
  const nVolume = count - nSurface;

  for (let i = 0; i < nSurface; i++) {
    let { x, y, z } = fibDirection(i, nSurface);

    const n1 = noise3(x * 2.2, y * 2.2, z * 2.2);
    const n2 = noise3(x * 5.5 + 1.3, y * 5.5, z * 5.5 - 0.7);
    const n3 = noise3(x * 11.0, y * 11.0 + 2.1, z * 11.0);
    const fold = 0.2 * n1 + 0.1 * n2 + 0.045 * n3;

    const hemisphere = Math.sign(x || 0.001) * 0.07 * Math.abs(x);
    const sulcus = -0.05 * Math.exp(-x * x * 8.0);
    const radius = 1.0 + fold + hemisphere + sulcus;

    x *= radius * scaleX;
    y *= radius * scaleY;
    z *= radius * scaleZ;
    y += 0.08;

    x += (hash(i * 0.137 + 19.7) - 0.5) * 0.035;
    y += (hash(i * 0.271 + 3.1) - 0.5) * 0.025;
    z += (hash(i * 0.419 + 7.9) - 0.5) * 0.035;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  // Interior volume — cube-root radius for uniform density
  for (let j = 0; j < nVolume; j++) {
    const i = nSurface + j;
    let { x, y, z } = fibDirection(j * 3 + 7, nVolume * 3);

    const u = hash(j * 0.91 + 2.3);
    const r = Math.cbrt(u) * 0.72;

    const n1 = noise3(x * 3.1, y * 3.1, z * 3.1) * 0.08;
    const hemisphere = Math.sign(x || 0.001) * 0.04 * Math.abs(x);

    x *= (r + n1 + hemisphere) * scaleX;
    y *= (r + n1) * scaleY;
    z *= (r + n1) * scaleZ;
    y += 0.06;

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

export function createGlobe(count) {
  const positions = new Float32Array(count * 3);
  const nSurface = Math.floor(count * 0.7);
  const nVolume = count - nSurface;
  const R = 1.08;

  for (let i = 0; i < nSurface; i++) {
    let { x, y, z } = fibDirection(i, nSurface);
    const lat = Math.asin(Math.max(-1, Math.min(1, y)));
    const band = Math.sin(lat * 6.0) * 0.025;
    const lon = Math.atan2(z, x);
    const ridge = Math.sin(lon * 8.0) * 0.02;
    const n = noise3(x * 4, y * 4, z * 4) * 0.035;
    const radius = R + band + ridge + n;
    positions[i * 3] = x * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = z * radius;
  }

  for (let j = 0; j < nVolume; j++) {
    const i = nSurface + j;
    let { x, y, z } = fibDirection(j + 5, nVolume);
    const r = Math.cbrt(hash(j * 1.1)) * 0.85;
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

export const SHAPE_NAMES = ['brain', 'bulb', 'globe', 'network'];

export function generateAllShapes(count) {
  return {
    brain: createBrain(count),
    bulb: createBulb(count),
    globe: createGlobe(count),
    network: createNetwork(count),
  };
}

export function getParticleCount() {
  return deviceParticleCount();
}

export function createBrainShape(count) {
  return createBrain(count);
}
