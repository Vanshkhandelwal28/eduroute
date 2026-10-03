/**
 * React wrapper — GPU SPH fluid for EduRoute landing.
 * Exposes morph progress via scroll; mouse push/pull on GPU uniforms only.
 */
import { useEffect, useRef, useState } from 'react';
import { SPHSimulation } from '../webgl/sph/SPHSimulation';

export function SPHFluidCanvas({
  progressRef,
  showGui = false,
}: {
  progressRef: React.MutableRefObject<number>;
  showGui?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sphRef = useRef<SPHSimulation | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sph = new SPHSimulation(canvas, {
      particleCount: window.innerWidth < 768 ? 1024 : 2048,
      neighborStride: window.innerWidth < 768 ? 3 : 2,
    });
    sphRef.current = sph;

    if (!sph.supported) {
      setFallback(sph.fallbackReason || 'GPU SPH not supported');
      return;
    }

    let gui: { destroy: () => void } | null = null;
    if (showGui) {
      void import('lil-gui')
        .then(({ default: GUI }) => {
          const g = new GUI({ title: 'SPH Fluid' });
          g.add(sph.params, 'particleSize', 2, 20, 0.5).name('Point size');
          g.add(sph.params, 'smoothingRadius', 0.08, 0.4, 0.01).name('h (radius)');
          g.add(sph.params, 'restDensity', 1, 30, 0.5).name('Rest density');
          g.add(sph.params, 'gasConstant', 1, 80, 1).name('Pressure');
          g.add(sph.params, 'viscosity', 0, 1, 0.01).name('Viscosity');
          g.add(sph.params, 'damping', 0.9, 1, 0.001).name('Damping');
          g.add(sph.params, 'mouseForce', -40, 40, 1).name('Mouse force');
          g.add(sph.params, 'simSpeed', 0.1, 2, 0.05).name('Sim speed');
          g.add(sph.params.gravity, 'y', -10, 2, 0.1).name('Gravity Y');
          gui = g;
        })
        .catch(() => undefined);
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      // Map NDC to sim bounds approx
      sph.setMouse(nx * 1.1, ny * 0.9, 0);
    };
    const onLeave = () => sph.setMouse(0, -10, 0);
    window.addEventListener('mousemove', onMove, { passive: true });
    canvas.addEventListener('mouseleave', onLeave);

    const onResize = () => sph.onResize();
    window.addEventListener('resize', onResize);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      sph.setMorphProgress(progressRef.current);
      sph.update(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mouseleave', onLeave);
      gui?.destroy();
      sph.dispose();
      sphRef.current = null;
    };
  }, [progressRef, showGui]);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full block" />
      {fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#080808] px-6 text-center">
          <p className="max-w-md text-[13px] font-light leading-relaxed text-white/50">
            {fallback}
            <br />
            <span className="text-white/30">GPU SPH requires WebGL2 + float render targets.</span>
          </p>
        </div>
      )}
    </div>
  );
}
