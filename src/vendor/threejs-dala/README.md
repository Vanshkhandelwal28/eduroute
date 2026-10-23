# threejs-dala (vendored)

Faithful mirror of the open-source **Dala.ai WebGL module** by Francesco Michelini.

- Upstream: https://github.com/kekkorider/threejs-dala
- Original site: https://dala.craftedbygc.com / https://dala.ai
- License: MIT (see `LICENSE`)

## What’s included

| Path | Source |
|------|--------|
| `shaders/brain.vertex.glsl` | Upstream vertex shader |
| `shaders/brain.fragment.glsl` | Upstream fragment shader |
| `shaders/modules/rotate.glsl` | `mat2 rotate` helper |
| `original/index.js` | Upstream app entry (reference) |
| `original/index.html` | Upstream HTML shell |
| `original/index.scss` | Upstream styles |

## Runtime integration

Eduroute loads the brain via React Three Fiber in:

`src/components/DalaBrainHero.tsx`

- **Model:** `brain.glb` from jsDelivr CDN of this repo’s `static/brain.glb` (same asset as upstream).
- **Logic:** instanced `BoxGeometry(0.004)` on every brain vertex, distance-field scale/rotate in GLSL, raycast + camera parallax.

Demo of upstream replica: https://threejs-dala-replica.vercel.app
