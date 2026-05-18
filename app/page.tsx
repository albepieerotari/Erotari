'use client';

import { useState, useEffect } from 'react';
import IntroScene  from '@/components/IntroScene';
import MeasurePath from '@/components/MeasurePath';
import KeepPath    from '@/components/KeepPath';

export type Phase = 'intro' | 'measure' | 'keep';

export default function Home() {
  const [phase, setPhase] = useState<Phase>('intro');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [phase]);

  return (
    <main style={{ position: 'relative', width: '100vw' }}>

      {phase === 'intro' && (
        <IntroScene onChoose={(p) => setPhase(p)} />
      )}

      {phase === 'measure' && (
        <MeasurePath />
      )}

      {phase === 'keep' && (
        <KeepPath />
      )}

    </main>
  );
}