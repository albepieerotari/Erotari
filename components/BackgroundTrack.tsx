'use client';

import { useEffect, useRef } from 'react';

interface Props {
  scrollProgress: number; // 0→1
}

export default function BackgroundTrack({ scrollProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // avvia il loop appena il componente monta
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      // autoplay bloccato dal browser — aspetta interazione utente
      const resume = () => { video.play(); document.removeEventListener('click', resume); };
      document.addEventListener('click', resume);
    });
  }, []);

  return (
    <div style={{
      position: 'absolute',
      inset:    0,
      overflow: 'hidden',
    }}>
      <video
        ref={videoRef}
        src="/videos/scene_01.mp4"
        muted
        loop
        playsInline
        preload="auto"
        style={{
          width:     '100%',
          height:    '100%',
          objectFit: 'cover',
          display:   'block',
        }}
      />
    </div>
  );
}