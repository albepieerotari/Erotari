'use client';

import { useEffect, useState, useCallback } from 'react';
import Image         from 'next/image';
import UnifiedCanvas from './UnifiedCanvas';

export default function IntroScene({ onChoose }: { onChoose: (phase: 'measure' | 'keep') => void }) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
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
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* video background — niente goccia */}
      <UnifiedCanvas
        gravity={0}
        mouseX={mouseX}
        mouseY={mouseY}
        dropShift={0}
        showDrop={false}
        neutralOpacity={0}
      />

      {/* velo scuro leggero sopra il video */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.5) 100%)',
        pointerEvents: 'none',
      }} />

      {/* logo — in cima al centro */}
      <div style={{
        position:       'absolute',
        top:            0,
        left:           0,
        right:          0,
        display:        'flex',
        justifyContent: 'center',
        pointerEvents:  'none',
        opacity:        visible ? 1 : 0,
        transition:     'opacity 1.0s ease',
      }}>
        <Image
          src="/erotari_logo.svg"
          alt="Erotari"
          width={160}
          height={40}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>

      {/* contenuto centrale */}
      <div style={{
        position:       'absolute',
        inset:          0,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '2.2rem',
        pointerEvents:  'none',
      }}>
        <p style={{
          fontFamily:    'Georgia, serif',
          fontSize:      'clamp(26px, 3vw, 38px)',
          letterSpacing: '0.12em',
          fontStyle:     'italic',
          color:         'rgba(255,255,255,1.0)',
          margin:        0,
          textAlign:     'center',
          textShadow:    '0 2px 24px rgba(0,0,0,0.4)',
          opacity:        visible ? 1 : 0,
          transition:     'opacity 3.8s ease',
        }}>
          Life Animates Time
        </p>

        <p style={{
          fontFamily:    'Georgia, serif',
          fontSize:      'clamp(14px, 0.9vw, 12px)',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,1.0)',
          margin:        0,
          textAlign:     'center',
          opacity:        visible ? 1 : 0,
          transition:     'opacity 6.2s ease',
        }}>
          Soon to be revealed
        </p>
      </div>

      {/* footer */}
      <footer style={{
        position:       'absolute',
        bottom:         0,
        left:           0,
        right:          0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '2.5rem',
        padding:        '1.2rem 2.5rem',
        background:     'rgba(235, 225, 205, 0.08)',
        backdropFilter: 'blur(5px)',
        borderTop:      '0.5px solid rgba(235, 225, 205, 0.15)',
        opacity:        visible ? 1 : 0,
        transition:     'opacity 8s ease',
      }}>
        <a
          href="mailto:amministrazione@erotari.com"
          style={{
            fontFamily:     'Georgia, serif',
            fontSize:       'clamp(9px, 0.85vw, 11px)',
            letterSpacing:  '0.25em',
            textTransform:  'uppercase',
            color:          'rgba(235, 225, 205, 0.7)',
            textDecoration: 'none',
            transition:     'color 0.3s ease',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(235, 225, 205, 0.9)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(235, 225, 205, 0.7)'; }}
        >
          Contacts
        </a>

        <p style={{
          fontFamily:    'Georgia, serif',
          fontSize:      'clamp(9px, 0.85vw, 11px)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color:         'rgba(235, 225, 205, 0.5)',
          margin:        0,
        }}>
          {'Erotari™ — All rights reserved'}
        </p>
      </footer>

    </div>
  );
}