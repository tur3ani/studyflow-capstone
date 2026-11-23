import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface ConstellationBrainProps {
  variant?: 'hero' | 'dashboard' | 'ambient';
  /** 0..100 — gently boosts chromatic energy & illumination on the dashboard constellation */
  energy?: number;
  className?: string;
}

interface TriangleParticle {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  size: number;
  angle: number;
  rotSpeed: number;
  phase: number;
  driftAmp: number;
  color: string;
  alpha: number;
  ambient: boolean;
}

const CHROMATIC_PALETTE_DARK = [
  '#8052ff', // Electric Iris
  '#8052ff',
  '#9e7bff',
  '#ffb829', // Saffron Spark
  '#15846e', // Deep Verdant
  '#20c9a6',
  '#38bdf8', // Azure
  '#e879f9', // Magenta spark
];

const CHROMATIC_PALETTE_LIGHT = [
  '#6d3df5',
  '#6d3df5',
  '#c97a00',
  '#15846e',
  '#0284c7',
  '#c026d3',
];

/**
 * Checks whether normalized coordinates (nx, ny in [-1, 1]) lie inside an organic brain/cloud silhouette
 * built from overlapping cortical lobes so the particle field forms a recognizable neural constellation.
 */
function insideBrainSilhouette(nx: number, ny: number): boolean {
  // Slight tilt for natural profile look
  const x = nx;
  const y = ny;

  // Frontal + parietal upper-left lobe
  const l1 = ((x + 0.28) / 0.56) ** 2 + ((y + 0.14) / 0.5) ** 2 <= 1;
  // Occipital / upper-right lobe
  const l2 = ((x - 0.25) / 0.58) ** 2 + ((y + 0.12) / 0.52) ** 2 <= 1;
  // Temporal lower-left curve
  const l3 = ((x + 0.18) / 0.5) ** 2 + ((y - 0.26) / 0.36) ** 2 <= 1;
  // Cerebellum lower-right cluster
  const l4 = ((x - 0.34) / 0.35) ** 2 + ((y - 0.34) / 0.28) ** 2 <= 1;
  // Subtle central fissure indentation at the very bottom-center
  const notch = x > -0.05 && x < 0.15 && y > 0.42;

  return (l1 || l2 || l3 || l4) && !notch;
}

export function ConstellationBrain({
  variant = 'hero',
  energy = 65,
  className = '',
}: ConstellationBrainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = theme === 'dark' ? CHROMATIC_PALETTE_DARK : CHROMATIC_PALETTE_LIGHT;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: TriangleParticle[] = [];
    let pointer = { x: -9999, y: -9999 };
    let rafId = 0;

    // Deterministic seeded PRNG so the brain silhouette looks balanced every render
    let seed = variant === 'hero' ? 4219 : variant === 'dashboard' ? 8821 : 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const buildParticles = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(100, rect.width);
      height = Math.max(100, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = [];

      if (variant === 'ambient') {
        const count = Math.min(110, Math.floor((width * height) / 14000));
        for (let i = 0; i < count; i++) {
          particles.push({
            baseX: rand() * width,
            baseY: rand() * height,
            x: 0,
            y: 0,
            size: 2.8 + rand() * 3.8,
            angle: rand() * Math.PI * 2,
            rotSpeed: (rand() - 0.5) * 0.008,
            phase: rand() * Math.PI * 2,
            driftAmp: 4 + rand() * 8,
            color: palette[Math.floor(rand() * palette.length)],
            alpha: theme === 'dark' ? 0.22 + rand() * 0.35 : 0.18 + rand() * 0.25,
            ambient: true,
          });
        }
        return;
      }

      const cx = width * 0.5;
      const cy = height * 0.5;
      const rx = Math.min(width, height) * (variant === 'hero' ? 0.44 : 0.46);
      const ry = Math.min(width, height) * (variant === 'hero' ? 0.39 : 0.41);

      const coreTarget = variant === 'hero' ? 360 : 170;
      const ambientTarget = variant === 'hero' ? 75 : 32;

      let attempts = 0;
      while (particles.length < coreTarget && attempts < coreTarget * 12) {
        attempts++;
        const nx = (rand() - 0.5) * 2;
        const ny = (rand() - 0.5) * 2;
        if (!insideBrainSilhouette(nx, ny)) continue;

        // Concentrate slightly more near ridges for organic depth
        const radial = Math.hypot(nx, ny);
        if (radial < 0.35 && rand() < 0.28) continue;

        const baseX = cx + nx * rx;
        const baseY = cy + ny * ry;
        const baseAlpha =
          theme === 'dark'
            ? 0.48 + (energy / 100) * 0.22 + rand() * 0.3
            : 0.42 + rand() * 0.38;

        particles.push({
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          size: (variant === 'hero' ? 2.6 : 2.1) + rand() * (variant === 'hero' ? 3.4 : 2.4),
          angle: rand() * Math.PI * 2,
          rotSpeed: (rand() - 0.5) * 0.012,
          phase: rand() * Math.PI * 2,
          driftAmp: 1.5 + rand() * 3.8,
          color: palette[Math.floor(rand() * palette.length)],
          alpha: Math.min(1, baseAlpha),
          ambient: false,
        });
      }

      // Ambient drifting triangle sparks outside the main constellation
      for (let i = 0; i < ambientTarget; i++) {
        const bx = rand() * width;
        const by = rand() * height;
        particles.push({
          baseX: bx,
          baseY: by,
          x: bx,
          y: by,
          size: 2.2 + rand() * 3.2,
          angle: rand() * Math.PI * 2,
          rotSpeed: (rand() - 0.5) * 0.01,
          phase: rand() * Math.PI * 2,
          driftAmp: 3 + rand() * 7,
          color: palette[Math.floor(rand() * palette.length)],
          alpha: theme === 'dark' ? 0.2 + rand() * 0.32 : 0.16 + rand() * 0.24,
          ambient: true,
        });
      }
    };

    const drawTriangle = (x: number, y: number, r: number, angle: number, color: string, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.restore();
    };

    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += reducedMotion ? 0 : 0.012;

      for (const p of particles) {
        const ox = Math.cos(t + p.phase) * p.driftAmp;
        const oy = Math.sin(t * 0.85 + p.phase * 1.3) * p.driftAmp;
        let px = p.baseX + ox;
        let py = p.baseY + oy;

        // Gentle interactive shimmer away from pointer
        const dx = px - pointer.x;
        const dy = py - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 85 && dist > 0.1) {
          const push = ((85 - dist) / 85) * 14;
          px += (dx / dist) * push;
          py += (dy / dist) * push;
        }

        const twinkle = 0.78 + 0.22 * Math.sin(t * 1.8 + p.phase);
        drawTriangle(px, py, p.size, p.angle + t * p.rotSpeed * 30, p.color, p.alpha * twinkle);
      }

      if (!reducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    buildParticles();
    render();

    const ro = new ResizeObserver(() => {
      buildParticles();
      if (reducedMotion) render();
    });
    ro.observe(canvas);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => {
      pointer = { x: -9999, y: -9999 };
    };

    if (variant !== 'ambient') {
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseleave', onLeave);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [variant, energy, theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block w-full h-full ${variant === 'ambient' ? 'pointer-events-none' : ''} ${className}`}
    />
  );
}
