'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import LiquidDrop from './FluidDrop';

type FigureState = 'falling' | 'splash' | 'swimming' | 'floating' | 'walking';

function Mannequin({ state, x, y }: { state: FigureState; x: number; y: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 50);
    return () => clearInterval(id);
  }, []);

  const cycle = (tick * 0.08) % (Math.PI * 2);

  const getJoints = () => {
    switch (state) {
      case 'swimming': return {
        bodyAngle: -20,
        lArmAngle: -40 + Math.sin(cycle) * 30,
        rArmAngle:  40 - Math.sin(cycle) * 30,
        lLegAngle: -30 + Math.sin(cycle + Math.PI) * 25,
        rLegAngle:  30 - Math.sin(cycle + Math.PI) * 25,
      };
      case 'floating': return {
        bodyAngle: Math.sin(cycle * 0.5) * 8,
        lArmAngle: -60 + Math.sin(cycle * 0.7) * 15,
        rArmAngle:  60 - Math.sin(cycle * 0.7) * 15,
        lLegAngle: -20 + Math.sin(cycle * 0.6) * 10,
        rLegAngle:  20 - Math.sin(cycle * 0.6) * 10,
      };
      case 'walking': return {
        bodyAngle: 0,
        lArmAngle:  Math.sin(cycle) * 35,
        rArmAngle: -Math.sin(cycle) * 35,
        lLegAngle:  Math.sin(cycle) * 40,
        rLegAngle: -Math.sin(cycle) * 40,
      };
      default: return {
        bodyAngle: 0,
        lArmAngle: -15,
        rArmAngle:  15,
        lLegAngle: -10,
        rLegAngle:  10,
      };
    }
  };

  const j = getJoints();
  const cx = 50, headY = 20, neckY = 34, hipY = 68, headR = 12, limb = 26;

  const endpoint = (ox: number, oy: number, angle: number, len: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: ox + Math.cos(rad) * len, y: oy + Math.sin(rad) * len };
  };

  const lArm = endpoint(cx - 6, neckY + 8, j.lArmAngle + 90, limb);
  const rArm = endpoint(cx + 6, neckY + 8, j.rArmAngle + 90, limb);
  const lLeg = endpoint(cx - 5, hipY, j.lLegAngle + 90, limb);
  const rLeg = endpoint(cx + 5, hipY, j.rLegAngle + 90, limb);
  const bobY = state === 'floating' ? Math.sin(cycle * 0.5) * 3 : 0;

  return (
    <svg
      viewBox="0 0 100 110"
      width="80"
      height="88"
      style={{
        position:  'absolute',
        left:      `${x}%`,
        top:       `${y}%`,
        transform: `translate(-50%, -50%) rotate(${j.bodyAngle}deg) translateY(${bobY}px)`,
        transition: 'transform 0.15s ease',
        filter:    'drop-shadow(0 2px 8px rgba(0,80,120,0.4))',
      }}
    >
      <circle cx={cx} cy={headY} r={headR} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <rect x={cx - headR} y={headY - headR - 5} width={headR * 2} height={6} rx="1" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <rect x={cx - headR - 3} y={headY - headR - 1} width={headR * 2 + 6} height={2} rx="1" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <line x1={cx} y1={neckY} x2={cx} y2={hipY} stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
      <line x1={cx - 12} y1={neckY + 8} x2={cx + 12} y2={neckY + 8} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={cx - 6} y1={neckY + 8} x2={lArm.x} y2={lArm.y} stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1={cx + 6} y1={neckY + 8} x2={rArm.x} y2={rArm.y} stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1={cx - 5} y1={hipY} x2={lLeg.x} y2={lLeg.y} stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1={cx + 5} y1={hipY} x2={rLeg.x} y2={rLeg.y} stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Splash({ intensity }: { intensity: number }) {
  if (intensity <= 0 || intensity >= 1) return null;
  const drops = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const dist  = intensity * 60;
    return {
      x: 50 + Math.cos(angle) * dist,
      y: 50 - Math.abs(Math.sin(angle)) * dist * 0.6,
      r: (1 - intensity) * 4 + 1,
    };
  });

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {drops.map((d, i) => (
        <circle key={i} cx={`${d.x}%`} cy={`${d.y}%`} r={d.r}
          fill={`rgba(140, 200, 240, ${(1 - intensity) * 0.8})`} />
      ))}
      <ellipse cx="50%" cy="50%"
        rx={`${intensity * 15}%`} ry={`${intensity * 4}%`}
        fill="none"
        stroke={`rgba(140, 200, 240, ${(1 - intensity) * 0.5})`}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function KeepPath() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mouseX, setMouseX] = useState(50);
  const [mouseY, setMouseY] = useState(50);
  const [dropSize, setDropSize] = useState(220);
  const [splashProgress, setSplashProgress] = useState(0);
  const splashRef  = useRef<number | null>(null);
  const splashDone = useRef(false);
  const waterRef   = useRef<HTMLDivElement>(null);

  const WATER_APPEARS = 0.5;
  const SPLASH_AT     = 0.92;
  const FIGURE_AT     = 0.97;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

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

      // reset splash se torna sopra la soglia
      if (progress < SPLASH_AT) {
        if (splashRef.current) cancelAnimationFrame(splashRef.current);
        splashDone.current = false;
        setSplashProgress(0);
        return;
      }

      // trigger splash — ogni volta che si supera SPLASH_AT da sotto
      if (!splashDone.current) {
        splashDone.current = true;
        let start: number | null = null;
        const animate = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 1200, 1);
          setSplashProgress(p);
          if (p < 1) splashRef.current = requestAnimationFrame(animate);
        };
        splashRef.current = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (splashRef.current) cancelAnimationFrame(splashRef.current);
    };
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!waterRef.current) return;
    const r = waterRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width)  * 100;
    const y = ((e.clientY - r.top)  / r.height) * 100;
    setMouseX(Math.max(0, Math.min(100, x)));
    setMouseY(Math.max(0, Math.min(100, y)));
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [onMouseMove]);

  const waterHeight = scrollProgress >= WATER_APPEARS
    ? Math.min((scrollProgress - WATER_APPEARS) / (1 - WATER_APPEARS), 1) * 70
    : 0;

  const dropFallY = scrollProgress >= WATER_APPEARS
    ? Math.min((scrollProgress - WATER_APPEARS) / (SPLASH_AT - WATER_APPEARS), 1)
    : 0;
  const dropY = dropFallY * (70 - 18);

  // sparisce istantaneamente allo splash — nessuna transition
  const dropVisible = scrollProgress < SPLASH_AT;

  const figureOpacity = scrollProgress >= FIGURE_AT
    ? Math.min((scrollProgress - FIGURE_AT) / 0.05, 1) : 0;

  const figureState: FigureState = (() => {
    if (mouseY < 25) return 'swimming';
    if (mouseY < 60) return 'floating';
    return 'walking';
  })();

  const figureX = mouseX;
  const figureY = Math.max(10, Math.min(85, mouseY));

  return (
    <>
      <div style={{ height: '400vh' }} />

      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

        {/* sfondo */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'radial-gradient(ellipse at 40% 30%, #1a2030 0%, #0a0d14 100%)',
        }} />

        {/* goccia che cade — sparisce istantaneamente allo splash */}
        {dropVisible && (
          <div style={{
            position:      'absolute',
            left:          '38%',
            top:           `calc(15% + ${dropY}vh)`,
            transform:     'translateX(-50%)',
            pointerEvents: 'none',
          }}>
            <LiquidDrop
              gravity={Math.min(scrollProgress * 2, 1)}
              mouseX={0}
              mouseY={0}
              size={dropSize}
            />
          </div>
        )}

        {/* splash — posizionato sulla superficie dell'acqua */}
        <div style={{
          position: 'absolute',
          left:     '28%',
          top:      `${100 - waterHeight - 5}%`,
          width:    '20%',
          height:   '10%',
        }}>
          <Splash intensity={splashProgress} />
        </div>

        {/* layer acqua */}
        <div
          ref={waterRef}
          style={{
            position:   'absolute',
            bottom:     0,
            left:       0,
            right:      0,
            height:     `${waterHeight}%`,
            background: 'linear-gradient(to bottom, rgba(20,60,100,0.7) 0%, rgba(10,30,60,0.95) 100%)',
            transition: 'height 0.05s linear',
            overflow:   'hidden',
          }}
        >
          {/* superficie shimmer */}
          <div style={{
            position:   'absolute',
            top:        0,
            left:       0,
            right:      0,
            height:     '3px',
            background: 'linear-gradient(to right, transparent, rgba(140,200,240,0.4), transparent)',
          }} />

          {/* mondo sottomarino navigabile col mouse — 200% x 200% */}
          <div style={{
            position:  'absolute',
            width:     '200%',
            height:    '200%',
            top:       0,
            left:      0,
            transform: `translate(
              ${-(mouseX / 100) * 50}%,
              ${-(mouseY / 100) * 50}%
            )`,
            transition: 'transform 0.4s ease-out',
          }}>

            {/* riflesso luce */}
            <div style={{
              position:   'absolute',
              top:        '5%',
              left:       '20%',
              width:      '60%',
              height:     '20%',
              background: 'radial-gradient(ellipse, rgba(140,200,240,0.08) 0%, transparent 70%)',
              filter:     'blur(12px)',
            }} />

            {/* manichino principale */}
            {figureOpacity > 0 && (
              <div style={{ opacity: figureOpacity, transition: 'opacity 0.8s ease' }}>
                <Mannequin state={figureState} x={figureX} y={figureY} />
              </div>
            )}

            {/* manichini secondari placeholder */}
            {figureOpacity > 0 && (
              <>
                <Mannequin state="floating" x={20} y={40} />
                <Mannequin state="walking"  x={75} y={80} />
                <Mannequin state="swimming" x={60} y={20} />
              </>
            )}

          </div>
        </div>

      </div>
    </>
  );
}