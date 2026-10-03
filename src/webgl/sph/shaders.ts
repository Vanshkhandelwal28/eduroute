/** GLSL sources for GPU SPH (WebGL2) */

export const fullscreenVert = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const densityFrag = /* glsl */ `
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPos;
uniform float uTexSize;
uniform float uParticleCount;
uniform float uH;
uniform float uMass;
uniform float uRestDensity;
uniform float uGasConst;
uniform float uStride;

const float PI = 3.14159265359;

float poly6(float r2, float h) {
  float h2 = h * h;
  if (r2 >= h2) return 0.0;
  float x = h2 - r2;
  return 315.0 / (64.0 * PI * pow(h, 9.0)) * x * x * x;
}

void main() {
  float id = floor(vUv.x * uTexSize) + floor(vUv.y * uTexSize) * uTexSize;
  if (id >= uParticleCount) {
    fragColor = vec4(0.0);
    return;
  }
  vec3 pi = texture(uPos, vUv).xyz;
  float density = 0.0;
  float stride = max(uStride, 1.0);
  float n = uParticleCount;
  float ts = uTexSize;

  for (float j = 0.0; j < 4096.0; j += stride) {
    if (j >= n) break;
    float jx = mod(j, ts);
    float jy = floor(j / ts);
    vec2 juv = (vec2(jx, jy) + 0.5) / ts;
    vec3 pj = texture(uPos, juv).xyz;
    vec3 rij = pi - pj;
    density += uMass * poly6(dot(rij, rij), uH);
  }
  density = max(density, uRestDensity * 0.2);
  float pressure = max(uGasConst * (density - uRestDensity), 0.0);
  fragColor = vec4(density, pressure, 0.0, 1.0);
}
`;

export const forceFrag = /* glsl */ `
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uDens;
uniform float uTexSize;
uniform float uParticleCount;
uniform float uH;
uniform float uMass;
uniform float uViscosity;
uniform float uStride;
uniform vec3 uGravity;
uniform vec3 uMouse;
uniform float uMouseForce;
uniform float uMouseRadius;
uniform float uMorphProgress;
uniform sampler2D uMorphTarget;
uniform float uMorphStrength;

const float PI = 3.14159265359;

float spikyGrad(float r, float h) {
  if (r <= 1e-6 || r >= h) return 0.0;
  float x = h - r;
  return -45.0 / (PI * pow(h, 6.0)) * x * x;
}

float viscLap(float r, float h) {
  if (r >= h) return 0.0;
  return 45.0 / (PI * pow(h, 6.0)) * (h - r);
}

void main() {
  float id = floor(vUv.x * uTexSize) + floor(vUv.y * uTexSize) * uTexSize;
  if (id >= uParticleCount) {
    fragColor = vec4(0.0);
    return;
  }
  vec3 pi = texture(uPos, vUv).xyz;
  vec3 vi = texture(uVel, vUv).xyz;
  vec2 di = texture(uDens, vUv).xy;
  float rhoi = max(di.x, 0.05);
  float pressi = di.y;

  vec3 fPress = vec3(0.0);
  vec3 fVisc = vec3(0.0);
  float stride = max(uStride, 1.0);
  float n = uParticleCount;
  float ts = uTexSize;

  for (float j = 0.0; j < 4096.0; j += stride) {
    if (j >= n) break;
    float jx = mod(j, ts);
    float jy = floor(j / ts);
    vec2 juv = (vec2(jx, jy) + 0.5) / ts;
    vec3 pj = texture(uPos, juv).xyz;
    vec3 rij = pi - pj;
    float r = length(rij);
    if (r < 1e-5 || r >= uH) continue;

    vec2 dj = texture(uDens, juv).xy;
    float rhoj = max(dj.x, 0.05);
    float pressj = dj.y;
    vec3 vj = texture(uVel, juv).xyz;

    vec3 dir = rij / r;
    fPress += -uMass * (pressi + pressj) / (2.0 * rhoj) * spikyGrad(r, uH) * dir;
    fVisc += uViscosity * uMass * (vj - vi) / rhoj * viscLap(r, uH);
  }

  vec3 fGrav = uGravity * rhoi;
  vec3 fMouse = vec3(0.0);
  vec3 toM = pi - uMouse;
  float md = length(toM);
  if (md < uMouseRadius && md > 1e-4) {
    fMouse = normalize(toM) * uMouseForce * (1.0 - md / uMouseRadius) * rhoi;
  }

  vec3 morphT = texture(uMorphTarget, vUv).xyz;
  vec3 fMorph = (morphT - pi) * uMorphStrength * uMorphProgress * rhoi;

  fragColor = vec4(fPress + fVisc + fGrav + fMouse + fMorph, rhoi);
}
`;

export const integrateFrag = /* glsl */ `
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uForce;
uniform float uDt;
uniform float uDamping;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;
uniform float uRestitution;
uniform float uWriteMode;

void main() {
  vec3 p = texture(uPos, vUv).xyz;
  vec3 v = texture(uVel, vUv).xyz;
  vec4 f = texture(uForce, vUv);
  float rho = max(f.w, 0.05);
  vec3 a = f.xyz / rho;

  float aLen = length(a);
  if (aLen > 80.0) a *= 80.0 / aLen;

  v = (v + a * uDt) * uDamping;
  float vLen = length(v);
  if (vLen > 12.0) v *= 12.0 / vLen;

  p = p + v * uDt;

  if (p.x < uBoundsMin.x) { p.x = uBoundsMin.x; v.x *= -uRestitution; }
  if (p.x > uBoundsMax.x) { p.x = uBoundsMax.x; v.x *= -uRestitution; }
  if (p.y < uBoundsMin.y) { p.y = uBoundsMin.y; v.y *= -uRestitution; }
  if (p.y > uBoundsMax.y) { p.y = uBoundsMax.y; v.y *= -uRestitution; }
  if (p.z < uBoundsMin.z) { p.z = uBoundsMin.z; v.z *= -uRestitution; }
  if (p.z > uBoundsMax.z) { p.z = uBoundsMax.z; v.z *= -uRestitution; }

  if (uWriteMode < 0.5) {
    fragColor = vec4(v, 1.0);
  } else {
    fragColor = vec4(p, 1.0);
  }
}
`;

/** Dim, discrete particles — Normal blending friendly */
export const particleVert = /* glsl */ `
precision highp float;
precision highp sampler2D;

uniform sampler2D uPos;
uniform float uTexSize;
uniform float uParticleCount;
uniform float uPointSize;

varying float vAlpha;
varying float vDepth;

void main() {
  float id = float(gl_VertexID);
  if (id >= uParticleCount) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vDepth = 0.0;
    return;
  }
  float ts = uTexSize;
  float x = mod(id, ts);
  float y = floor(id / ts);
  vec2 uv = (vec2(x, y) + 0.5) / ts;
  vec3 pos = texture2D(uPos, uv).xyz;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float dist = max(0.5, -mvPosition.z);
  // Smaller points — was up to 64px and blown out
  gl_PointSize = clamp(uPointSize * (90.0 / dist), 1.5, 18.0);
  vAlpha = 1.0;
  vDepth = dist;
}
`;

export const particleFrag = /* glsl */ `
precision highp float;

varying float vAlpha;
varying float vDepth;
uniform vec3 uColor;
uniform vec3 uAccent;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;

  // Soft disk, low alpha so overlaps don't wash to white
  float edge = 1.0 - smoothstep(0.2, 0.5, d);
  float core = 1.0 - smoothstep(0.0, 0.22, d);
  vec3 col = mix(uColor, uAccent, core * 0.35);
  // Depth fade slightly + keep alpha modest
  float alpha = edge * edge * vAlpha * 0.45;
  gl_FragColor = vec4(col, alpha);
}
`;
