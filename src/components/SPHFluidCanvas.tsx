/**
 * React wrapper — GPU SPH fluid for EduRoute landing.
 */
import { useEffect, useRef, useState } from 'react';
import { SPHSimulation } from '../webgl/sph/SPHSimulation';

export function SPHFluidCanvas({
  progressRef,
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

    const parent = canvas.parentElement;
    if (parent) {
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || window.innerHeight;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.width = Math.max(1, Math.floor(w * Math.min(window.devicePixelRatio, 1.5)));
      canvas.height = Math.max(1, Math.floor(h * Math.min(window.devicePixelRatio, 1.5)));
    }

    const isMobile = window.innerWidth < 768;
    let sph: SPHSimulation;
    try {
      sph = new SPHSimulation(canvas, {
        particleCount: isMobile ? 900 : 1600,
        neighborStride: isMobile ? 3 : 2,
        particleSize: isMobile ? 6 : 5,
      });
    } catch (err) {
      setFallback(err instanceof Error ? err.message : 'Failed to init WebGL');
      return;
    }
    sphRef.current = sph;

    if (!sph.supported) {
      setFallback(sph.fallbackReason || 'GPU SPH not supported');
      return;
    }

    const resize = () => sph.onResize();
    resize();
    const t1 = window.setTimeout(resize, 50);
    const t2 = window.setTimeout(resize, 200);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      sph.setMouse(nx * 1.15, ny * 0.95, 0);
    };
    const onLeave = () => sph.setMouse(0, -10, 0);
    window.addEventListener('mousemove', onMove, { passive: true });
    canvas.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', resize);

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
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mouseleave', onLeave);
      sph.dispose();
      sphRef.current = null;
    };
  }, [progressRef]);

  return (
    <div className="absolute inset-0" style={{ background: '#080808' }}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
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
