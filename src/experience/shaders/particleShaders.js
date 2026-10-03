/**
 * Custom GLSL shaders for tiny triangular geometric particles.
 * Phase 4: positions sampled from GPU simulation texture.
 */

export const particleVertexShader = /* glsl */ `
uniform float uTime;
uniform float uBreathAmount;
uniform float uBreathSpeed;
uniform sampler2D uPositionTexture;
uniform float uTexSize;

attribute float aScale;
attribute float aSeed;
attribute float aBrightness;
attribute float aIndex; // particle index 0..count-1

varying float vBrightness;
varying float vSeed;

void main() {
  vBrightness = aBrightness;
  vSeed = aSeed;

  // Sample GPU-simulated position
  float id = aIndex;
  float ts = uTexSize;
  float x = mod(id, ts);
  float y = floor(id / ts);
  vec2 uv = (vec2(x, y) + 0.5) / ts;

  vec4 posData = texture2D(uPositionTexture, uv);
  vec3 simPos = posData.xyz;

  // Local triangle vertex, scaled per-particle
  vec3 local = position * aScale;

  // Seed-based micro rotation
  float angle = aSeed * 6.2831853 + uTime * 0.04;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  local.xy = rot * local.xy;

  // World position = simulated center + local triangle offset
  vec3 worldPos = simPos + local;

  // Extra subtle visual breathing on top of GPU spring (very light)
  float phase = aSeed * 6.2831853;
  float breath = sin(uTime * uBreathSpeed + phase) * uBreathAmount * 0.4;
  vec3 dir = normalize(simPos + vec3(0.0001));
  worldPos += dir * breath;

  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleFragmentShader = /* glsl */ `
varying float vBrightness;
varying float vSeed;

void main() {
  vec3 base = vec3(0.93, 0.91, 0.96);
  vec3 accent = vec3(0.50, 0.32, 1.0);
  float tint = fract(vSeed * 7.13);
  vec3 col = mix(base, accent, tint * 0.28);

  col *= (0.50 + vBrightness * 0.55);

  float alpha = 0.72;

  gl_FragColor = vec4(col, alpha);
}
`;
