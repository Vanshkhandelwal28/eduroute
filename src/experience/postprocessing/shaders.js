/**
 * Custom post-processing shaders — film grain + vignette.
 */

export const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Fine animated grain — barely visible
      float n = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 0.07) * 100.0);
      n = (n - 0.5) * uIntensity;

      color.rgb += n;
      gl_FragColor = color;
    }
  `,
};

export const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDarkness: { value: 0.45 },
    uOffset: { value: 1.15 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uOffset;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Subtle radial vignette — center stays clear
      vec2 uv = (vUv - 0.5) * 2.0;
      float dist = dot(uv, uv);
      float vig = smoothstep(uOffset, uOffset - 0.85, dist);
      color.rgb *= mix(1.0 - uDarkness, 1.0, vig);

      gl_FragColor = color;
    }
  `,
};
