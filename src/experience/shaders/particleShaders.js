/**
 * Particle shaders — live-Dala multi-color palette.
 * Yellow / purple / teal / green / white / coral / blue.
 * Individual triangles must read clearly on pure black.
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

  // Slow individual spin so triangles stay readable
  float angle = aSeed * 6.2831853 + uTime * 0.028;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  local.xy = rot * local.xy;

  vec3 worldPos = simPos + local;

  float phase = aSeed * 6.2831853;
  float breath = sin(uTime * uBreathSpeed + phase) * uBreathAmount * 0.3;
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
  // Live Dala palette — vibrant multi-hue on pure black
  vec3 c0 = vec3(0.961, 0.843, 0.431); // #f5d76e yellow/gold
  vec3 c1 = vec3(0.765, 0.608, 0.827); // #c39bd3 light purple
  vec3 c2 = vec3(0.608, 0.349, 0.714); // #9b59b6 purple
  vec3 c3 = vec3(0.102, 0.737, 0.612); // #1abc9c teal/cyan
  vec3 c4 = vec3(0.180, 0.800, 0.443); // #2ecc71 green
  vec3 c5 = vec3(1.000, 1.000, 1.000); // #ffffff white
  vec3 c6 = vec3(0.906, 0.298, 0.235); // #e74c3c coral
  vec3 c7 = vec3(0.204, 0.596, 0.859); // #3498db blue

  float t = fract(vSeed * 7.13);
  vec3 col;
  if      (t < 0.125) col = mix(c0, c1, t * 8.0);
  else if (t < 0.250) col = mix(c1, c2, (t - 0.125) * 8.0);
  else if (t < 0.375) col = mix(c2, c3, (t - 0.250) * 8.0);
  else if (t < 0.500) col = mix(c3, c4, (t - 0.375) * 8.0);
  else if (t < 0.625) col = mix(c4, c5, (t - 0.500) * 8.0);
  else if (t < 0.750) col = mix(c5, c6, (t - 0.625) * 8.0);
  else if (t < 0.875) col = mix(c6, c7, (t - 0.750) * 8.0);
  else                col = mix(c7, c0, (t - 0.875) * 8.0);

  // Bright enough to read individual triangles on black
  col *= (0.62 + vBrightness * 0.55);

  float alpha = 0.82 * uOpacity;

  gl_FragColor = vec4(col, alpha);
}
`;
