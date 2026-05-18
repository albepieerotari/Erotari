'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import LiquidDrop from './FluidDrop';

// --- Orologio SVG analogico ---
function Clock({ progress }: { progress: number }) {
  const minuteDeg = progress * 360;
  const hourDeg   = progress * 360 * (1/12);

  const startHour   = 330;
  const startMinute = 0;

  const mDeg = startMinute + minuteDeg;
  const hDeg = startHour   + hourDeg;

  const cx = 100;
  const cy = 100;
  const r  = 80;

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const isMaj = i % 5 === 0;
    const inner = isMaj ? r - 12 : r - 6;
    return {
      x1: cx + Math.cos(angle) * inner,
      y1: cy + Math.sin(angle) * inner,
      x2: cx + Math.cos(angle) * r,
      y2: cy + Math.sin(angle) * r,
      isMaj,
    };
  });

  const handPoint = (deg: number, length: number) => {
    const angle = (deg - 90) * (Math.PI / 180);
    return { x: cx + Math.cos(angle) * length, y: cy + Math.sin(angle) * length };
  };

  const minuteEnd = handPoint(mDeg, r - 14);
  const hourEnd   = handPoint(hDeg, r - 28);
  const atMidnight = progress >= 0.98;

  return (
    <svg
      viewBox="0 0 200 200"
      width="200"
      height="200"
      style={{
        filter:     atMidnight ? 'drop-shadow(0 0 18px rgba(255,200,100,0.6))' : 'none',
        transition: 'filter 0.8s ease',
      }}
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2" />

      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isMaj ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}
          strokeWidth={t.isMaj ? 1.2 : 0.6}
        />
      ))}

      <line x1={cx} y1={cy} x2={hourEnd.x} y2={hourEnd.y}
        stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={minuteEnd.x} y2={minuteEnd.y}
        stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill="rgba(255,255,255,0.7)" />

      {atMidnight && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,200,100,0.3)" strokeWidth="8" />
      )}
    </svg>
  );
}

// --- Particelle impatto ---
interface Particle {
  id:      number;
  x:       number;
  y:       number;
  vx:      number;
  vy:      number;
  life:    number;
  maxLife: number;
  size:    number;
}

function useParticles(trigger: boolean) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const rafRef    = useRef<number>(0);
  const triggered = useRef(false);

  useEffect(() => {
    if (!trigger || triggered.current) return;
    triggered.current = true;

    const burst: Particle[] = Array.from({ length: 48 }, (_, i) => ({
      id:      i,
      x:       50,
      y:       72,
      vx:      (Math.random() - 0.5) * 4.5,
      vy:      -(Math.random() * 3 + 0.5),
      life:    1,
      maxLife: 0.6 + Math.random() * 0.8,
      size:    1 + Math.random() * 3,
    }));

    setParticles(burst);

    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setParticles(prev => {
        const next = prev
          .map(p => ({
            ...p,
            x:    p.x + p.vx * dt * 12,
            y:    p.y + p.vy * dt * 12,
            vy:   p.vy + 4 * dt,
            life: p.life - dt / p.maxLife,
          }))
          .filter(p => p.life > 0);
        if (next.length === 0) return next;
        rafRef.current = requestAnimationFrame(loop);
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger]);

  return particles;
}

// --- Componente principale ---
export default function MeasurePath() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mouseX,   setMouseX]   = useState(0);
  const [mouseY,   setMouseY]   = useState(0);
  const [dropSize, setDropSize] = useState(220);

  // reset scroll al mount — così parte sempre da 0
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const CLOCK_FADE_END = 0.08;
  const MIDNIGHT       = 0.92;
  const IMPACT_START   = 0.94;
  const DISSOLVE_START = 0.97;

  const clockOpacity  = Math.min(scrollProgress / CLOCK_FADE_END, 1);
  const atMidnight    = scrollProgress >= MIDNIGHT;
  const impactPhase   = scrollProgress >= IMPACT_START
    ? (scrollProgress - IMPACT_START) / (1 - IMPACT_START) : 0;
  const dissolvePhase = scrollProgress >= DISSOLVE_START
    ? (scrollProgress - DISSOLVE_START) / (1 - DISSOLVE_START) : 0;

  const dropFallY  = impactPhase > 0 ? `calc(-50% + ${impactPhase * 22}vh)` : '-50%';
  const dropOpacity = 1 - dissolvePhase;

  const particles = useParticles(scrollProgress >= IMPACT_START);

  useEffect(() => {
    const calc = () =>
      setDropSize(Math.round(Math.min(window.innerWidth * 0.16, 240)));
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max      = document.body.scrollHeight - window.innerHeight;
      const progress = Math.min(window.scrollY / (max * 0.85), 1);
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onMove = useCallback((e: MouseEvent) => {
    setMouseX((e.clientX / window.innerWidth  - 0.5) * 2);
    setMouseY((e.clientY / window.innerHeight - 0.5) * 2);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [onMove]);

  return (
    <>
      <div style={{ height: '400vh' }} />

      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

        {/* sfondo */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'radial-gradient(ellipse at 40% 50%, #1c1a24 0%, #0e0d14 100%)',
        }} />

        {/* pavimento cemento */}
        <div style={{
          position:   'absolute',
          bottom:     0,
          left:       0,
          right:      0,
          height:     '30%',
          background: 'linear-gradient(to top, #18161e, transparent)',
          opacity:    impactPhase,
          transition: 'opacity 0.3s ease',
        }} />

        {/* layout centrale */}
        <div style={{
          position:       'absolute',
          inset:          0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '5rem',
        }}>

          {/* goccia */}
          <div style={{
            position:   'relative',
            flexShrink: 0,
            transform:  `translateX(-4vw) translateY(${dropFallY})`,
            opacity:    dropOpacity,
            transition: impactPhase > 0 ? 'transform 0.4s ease-in' : 'none',
          }}>
            <LiquidDrop
              gravity={Math.min(scrollProgress / MIDNIGHT, 1)}
              mouseX={mouseX}
              mouseY={mouseY}
              size={dropSize}
            />
          </div>

          {/* orologio */}
          <div style={{
            opacity:    clockOpacity,
            transition: 'opacity 0.6s ease',
            flexShrink: 0,
          }}>
            <Clock progress={Math.min(scrollProgress / MIDNIGHT, 1)} />
          </div>

        </div>

        {/* particelle impatto */}
        {particles.length > 0 && (
          <svg style={{
            position:      'absolute',
            inset:         0,
            width:         '100%',
            height:        '100%',
            pointerEvents: 'none',
          }}>
            {particles.map(p => (
              <circle
                key={p.id}
                cx={`${p.x}%`}
                cy={`${p.y}%`}
                r={p.size}
                fill={`rgba(120, 160, 220, ${p.life * 0.7})`}
              />
            ))}
          </svg>
        )}

        {/* vapore post impatto */}
        {dissolvePhase > 0 && (
          <div style={{
            position:   'absolute',
            left:       '30%',
            top:        '60%',
            width:      '20%',
            height:     '20%',
            background: 'radial-gradient(ellipse, rgba(140,170,220,0.15) 0%, transparent 70%)',
            opacity:    dissolvePhase * (1 - dissolvePhase * 0.5),
            filter:     'blur(18px)',
            transform:  `translateY(${-dissolvePhase * 40}px)`,
            transition: 'transform 0.1s linear',
          }} />
        )}

      </div>
    </>
  );
}