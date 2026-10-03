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

/** Density + pressure from poly6 kernel (GPU neighbor scan with spatial stride) */
export const densityFrag = /* glsl */ `
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPos;
uniform float uTexSize;
uniform float uParticleCount;
uniform float uH;          // smoothing radius
uniform float uMass;
uniform float uRestDensity;
uniform float uGasConst;
uniform float uStride;     // neighbor sample stride (>=1)

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
  float h = uH;
  float h2 = h * h;
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
    float r2 = dot(rij, rij);
    density += uMass * poly6(r2, h);
  }
  density = max(density, uRestDensity * 0.15);
  float pressure = uGasConst * (density - uRestDensity);
  fragColor = vec4(density, pressure, 0.0, 1.0);
}
`;

/** Forces: pressure (spiky grad) + viscosity + gravity + mouse + morph attract */
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
  if (r <= 0.0 || r >= h) return 0.0;
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
  float rhoi = max(di.x, 0.001);
  float pressi = di.y;

  vec3 fPress = vec3(0.0);
  vec3 fVisc = vec3(0.0);
  float h = uH;
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
    float r2 = dot(rij, rij);
    float r = sqrt(r2);
    if (r < 1e-5 || r >= h) continue;

    vec2 dj = texture(uDens, juv).xy;
    float rhoj = max(dj.x, 0.001);
    float pressj = dj.y;
    vec3 vj = texture(uVel, juv).xyz;

    vec3 dir = rij / r;
    float grad = spikyGrad(r, h);
    fPress += -uMass * (pressi + pressj) / (2.0 * rhoj) * grad * dir;
    fVisc += uViscosity * uMass * (vj - vi) / rhoj * viscLap(r, h);
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

  vec3 force = fPress + fVisc + fGrav + fMouse + fMorph;
  fragColor = vec4(force, rhoi);
}
`;

/** Integrate velocity + position, box bounds */
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
uniform int uWriteMode; // 0 = new vel, 1 = new pos

void main() {
  vec3 p = texture(uPos, vUv).xyz;
  vec3 v = texture(uVel, vUv).xyz;
  vec4 f = texture(uForce, vUv);
  float rho = max(f.w, 0.001);
  vec3 a = f.xyz / rho;

  v = (v + a * uDt) * uDamping;
  p = p + v * uDt;

  // Boundary collisions
  if (p.x < uBoundsMin.x) { p.x = uBoundsMin.x; v.x *= -uRestitution; }
  if (p.x > uBoundsMax.x) { p.x = uBoundsMax.x; v.x *= -uRestitution; }
  if (p.y < uBoundsMin.y) { p.y = uBoundsMin.y; v.y *= -uRestitution; }
  if (p.y > uBoundsMax.y) { p.y = uBoundsMax.y; v.y *= -uRestitution; }
  if (p.z < uBoundsMin.z) { p.z = uBoundsMin.z; v.z *= -uRestitution; }
  if (p.z > uBoundsMax.z) { p.z = uBoundsMax.z; v.z *= -uRestitution; }

  if (uWriteMode == 0) {
    fragColor = vec4(v, 1.0);
  } else {
    fragColor = vec4(p, 1.0);
  }
}
`;

export const particleVert = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform sampler2D uPos;
uniform float uTexSize;
uniform float uParticleCount;
uniform float uPointSize;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out float vAlpha;
out vec3 vViewPos;

void main() {
  float id = float(gl_VertexID);
  if (id >= uParticleCount) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    return;
  }
  float ts = uTexSize;
  float x = mod(id, ts);
  float y = floor(id / ts);
  vec2 uv = (vec2(x, y) + 0.5) / ts;
  vec3 pos = texture(uPos, uv).xyz;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.5);
  gl_PointSize = uPointSize * (120.0 / dist);
  vAlpha = 1.0;
}
`;

export const particleFrag = /* glsl */ `
precision highp float;
in float vAlpha;
in vec3 vViewPos;
out vec4 fragColor;
uniform vec3 uColor;
uniform vec3 uAccent;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.05, d);
  float core = smoothstep(0.25, 0.0, d);
  vec3 col = mix(uColor, uAccent, core * 0.5);
  float alpha = soft * soft * vAlpha * 0.85;
  fragColor = vec4(col, alpha);
}
`;
