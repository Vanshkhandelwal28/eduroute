import { useEffect, useRef } from 'react';

/**
 * Aurora mesh background — soft vertical aurora bands + floating mesh nodes.
 * Distinct from Starfield / CosmicParticle / GradientDots (SIH26134 district plans).
 */
export function AuroraMeshBackground({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = mq.matches;
    const onMq = () => {
      reduced = mq.matches;
    };
    mq.addEventListener?.('change', onMq);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let t0 = performance.now();

    type Node = { x: number; y: number; vx: number; vy: number; r: number; phase: number };
    let nodes: Node[] = [];

    const isDark = () => document.documentElement.classList.contains('dark');

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect() ?? {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(36, Math.max(16, Math.floor((w * h) / 28000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.28,
        r: 1.2 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const drawAurora = (time: number) => {
      const dark = isDark();
      const bands = [
        { hue: dark ? '99,102,241' : '129,140,248', y: 0.18, amp: 0.08 },
        { hue: dark ? '139,92,246' : '167,139,250', y: 0.42, amp: 0.1 },
        { hue: dark ? '16,185,129' : '52,211,153', y: 0.68, amp: 0.07 },
      ];
      for (const b of bands) {
        const mid = h * b.y;
        const spread = h * (0.22 + b.amp);
        const g = ctx.createLinearGradient(0, mid - spread, 0, mid + spread);
        const pulse = reduced ? 0.12 : 0.1 + Math.sin(time * 0.0004 + b.y * 6) * 0.04;
        g.addColorStop(0, `rgba(${b.hue},0)`);
        g.addColorStop(0.5, `rgba(${b.hue},${pulse})`);
        g.addColorStop(1, `rgba(${b.hue},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, mid - spread, w, spread * 2);
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(32, now - t0);
      t0 = now;
      const dark = isDark();
      ctx.clearRect(0, 0, w, h);
      drawAurora(now);

      const linkDist = 110;
      const lineRgb = dark ? '165,180,252' : '99,102,241';

      if (!reduced) {
        for (const n of nodes) {
          n.x += n.vx * (dt / 16);
          n.y += n.vy * (dt / 16);
          n.phase += 0.02 * (dt / 16);
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          n.x = Math.max(0, Math.min(w, n.x));
          n.y = Math.max(0, Math.min(h, n.y));
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * (dark ? 0.28 : 0.18);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${lineRgb},${alpha})`;
            ctx.lineWidth = 1;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const glow = reduced ? 0.35 : 0.3 + Math.sin(n.phase) * 0.15;
        ctx.beginPath();
        ctx.fillStyle = dark
          ? `rgba(196,181,253,${0.4 + glow * 0.3})`
          : `rgba(99,102,241,${0.35 + glow * 0.25})`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduced) {
          ctx.beginPath();
          ctx.fillStyle = dark
            ? `rgba(167,139,250,${glow * 0.2})`
            : `rgba(129,140,248,${glow * 0.15})`;
          ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      mq.removeEventListener?.('change', onMq);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full ${className}`}
    />
  );
}

export default AuroraMeshBackground;
