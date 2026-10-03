/**
 * Particle shaders — mid balance:
 * structure clearly visible, no white wash, text remains readable.
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
attribute float aIndex;

varying float vBrightness;
varying float vSeed;

void main() {
  vBrightness = aBrightness;
  vSeed = aSeed;

  float id = aIndex;
  float ts = uTexSize;
  float x = mod(id, ts);
  float y = floor(id / ts);
  vec2 uv = (vec2(x, y) + 0.5) / ts;

  vec4 posData = texture2D(uPositionTexture, uv);
  vec3 simPos = posData.xyz;

  vec3 local = position * aScale;

  float angle = aSeed * 6.2831853 + uTime * 0.03;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  local.xy = rot * local.xy;

  vec3 worldPos = simPos + local;

  float phase = aSeed * 6.2831853;
  float breath = sin(uTime * uBreathSpeed + phase) * uBreathAmount * 0.35;
  vec3 dir = normalize(simPos + vec3(0.0001));
  worldPos += dir * breath;

  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleFragmentShader = /* glsl */ `
uniform float uOpacity;

varying float vBrightness;
varying float vSeed;

void main() {
  // Soft cool white + sparse violet — keep luminance in mid range
  vec3 base = vec3(0.82, 0.80, 0.90);
  vec3 accent = vec3(0.50, 0.35, 0.92);
  float tint = fract(vSeed * 7.13);
  vec3 col = mix(base, accent, tint * 0.20);

  // Mid luminance: visible structure, additive sum won't clip to pure white
  col *= (0.38 + vBrightness * 0.32);

  float alpha = 0.42 * uOpacity;

  gl_FragColor = vec4(col, alpha);
}
`;
