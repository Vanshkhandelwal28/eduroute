/**
 * Custom GLSL shaders for tiny triangular geometric particles.
 * Vertex: positions instances, applies breathing, size variation, seed-based rotation.
 * Fragment: soft geometric fragment look with brightness variation.
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

  // Instance base position comes from the instanceMatrix
  vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

  // Subtle breathing / floating — unique phase per particle
  float phase = aSeed * 6.28318;
  float breath = sin(uTime * uBreathSpeed + phase) * uBreathAmount;
  float floatY = sin(uTime * (uBreathSpeed * 0.7) + phase * 1.3) * uBreathAmount * 0.6;

  // Slight radial pulse
  vec3 dir = normalize(worldPos.xyz + 0.0001);
  worldPos.xyz += dir * breath;
  worldPos.y += floatY;

  // Local triangle vertex, scaled by per-particle size
  vec3 local = position * aScale;

  // Seed-based micro rotation for variety
  float angle = aSeed * 6.28318 + uTime * 0.05;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  local.xy = rot * local.xy;

  vec4 mvPosition = modelViewMatrix * worldPos;
  mvPosition.xyz += local;

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleFragmentShader = /* glsl */ `
varying float vBrightness;
varying float vSeed;

void main() {
  // Soft geometric fragment — not a perfect circle
  // Use a slight edge falloff so particles feel like tiny shards
  vec2 uv = gl_PointCoord; // unused for InstancedMesh triangles, but kept for safety

  // Base color — cool white with subtle seed-based tint toward accent
  vec3 base = vec3(0.92, 0.90, 0.95);
  vec3 accent = vec3(0.50, 0.32, 1.0); // soft purple
  float tint = fract(vSeed * 7.13);
  vec3 col = mix(base, accent, tint * 0.35);

  // Brightness variation
  col *= (0.55 + vBrightness * 0.55);

  // Slightly lower alpha so dense areas don't blow out
  float alpha = 0.85;

  gl_FragColor = vec4(col, alpha);
}
`;
