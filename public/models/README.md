# Models

## brain.glb

Self-host the Dala brain mesh for reliability (no external CDN dependency).

```bash
# From repo root
mkdir -p public/models
curl -fsSL -o public/models/brain.glb \
  "https://cdn.jsdelivr.net/gh/kekkorider/threejs-dala@main/static/brain.glb"
```

`DalaBrainHero` tries `/models/brain.glb` first, then falls back to the CDN.

Source: [kekkorider/threejs-dala](https://github.com/kekkorider/threejs-dala) (MIT).
