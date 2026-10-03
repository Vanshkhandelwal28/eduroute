/**
 * Custom GLSL shaders for tiny triangular geometric particles.
 * Vertex: instance transform + breathing + seed rotation + size variation.
 * Fragment: soft geometric fragment with brightness / tint variation.
 */

export const particleVertexShader = /* glsl */ `
uniform float uTime;
uniform float uBreathAmount;
uniform float uBreathSpeed;

attribute float aScale;
attribute float aSeed;
attribute float aBrightness;

varying float vBrightness;
varying float vSeed;

void main() {
  vBrightness = aBrightness;
  vSeed = aSeed;

  // Local triangle vertex, scaled per-particle
  vec3 local = position * aScale;

  // Seed-based micro rotation for variety
  float angle = aSeed * 6.2831853 + uTime * 0.04;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  local.xy = rot * local.xy;

  // Apply full instance matrix (position of this particle on the brain)
  vec4 worldPos = instanceMatrix * vec4(local, 1.0);

  // Subtle breathing / floating — unique phase per particle
  float phase = aSeed * 6.2831853;
  float breath = sin(uTime * uBreathSpeed + phase) * uBreathAmount;
  float floatY = sin(uTime * (uBreathSpeed * 0.65) + phase * 1.37) * uBreathAmount * 0.55;

  // Radial pulse from center + vertical float
  vec3 dir = normalize(worldPos.xyz + vec3(0.0001));
  worldPos.xyz += dir * breath;
  worldPos.y += floatY;

  vec4 mvPosition = modelViewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleFragmentShader = /* glsl */ `
varying float vBrightness;
varying float vSeed;

void main() {
  // Soft white with subtle seed-based purple tint
  vec3 base = vec3(0.93, 0.91, 0.96);
  vec3 accent = vec3(0.50, 0.32, 1.0);
  float tint = fract(vSeed * 7.13);
  vec3 col = mix(base, accent, tint * 0.28);

  // Per-particle brightness
  col *= (0.50 + vBrightness * 0.55);

  // Modest alpha — dense brain areas must not wash to pure white
  float alpha = 0.72;

  gl_FragColor = vec4(col, alpha);
}
`;
