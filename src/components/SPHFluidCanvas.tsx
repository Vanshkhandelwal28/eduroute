/**
 * React wrapper — GPU SPH fluid for EduRoute landing.
 * Mouse + morph via GPU uniforms only (no lil-gui dependency).
 */
import { useEffect, useRef, useState } from 'react';
import { SPHSimulation } from '../webgl/sph/SPHSimulation';

export function SPHFluidCanvas({
  progressRef,
}: {
  progressRef: React.MutableRefObject<number>;
  /** @deprecated GUI removed to avoid lil-gui package requirement */
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

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
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
      sph.dispose();
      sphRef.current = null;
    };
  }, [progressRef]);

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
