'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const STORAGE_KEY = 'erotari_video_trim';

interface Trim { inPoint: number; outPoint: number }

interface Props {
  scrollProgress: number;
}

const btn = (color: string): React.CSSProperties => ({
  padding:      '4px 10px',
  fontSize:     11,
  fontFamily:   'monospace',
  background:   'rgba(255,255,255,0.07)',
  color,
  border:       `1px solid ${color}55`,
  borderRadius: 3,
  cursor:       'pointer',
});

function fmt(t: number) {
  const m  = Math.floor(t / 60);
  const s  = Math.floor(t % 60);
  const cs = Math.floor((t % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export default function BackgroundTrack({ scrollProgress: _ }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const trimRef    = useRef<Trim>({ inPoint: 0, outPoint: 0 });
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);
  const [trim,     setTrim]     = useState<Trim>({ inPoint: 0, outPoint: 0 });
  const [open,     setOpen]     = useState(false);

  // keep trimRef in sync and persist
  useEffect(() => {
    trimRef.current = trim;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trim)); } catch {}
  }, [trim]);

  // init video + loop logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMeta = () => {
      const d = video.duration;
      setDuration(d);

      // restore saved trim — fallback to full range
      let saved: Trim = { inPoint: 0, outPoint: d };
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Trim;
          saved = {
            inPoint:  Math.max(0, Math.min(parsed.inPoint, d)),
            outPoint: Math.max(0, Math.min(parsed.outPoint || d, d)),
          };
        }
      } catch {}

      setTrim(saved);
      trimRef.current = saved;
      video.currentTime = saved.inPoint;

      video.play().catch(() => {
        const resume = () => { video.play(); document.removeEventListener('click', resume); };
        document.addEventListener('click', resume);
      });
    };

    const onTime = () => {
      setCurrent(video.currentTime);
      const { inPoint, outPoint } = trimRef.current;
      if (outPoint > inPoint && video.currentTime >= outPoint) {
        video.currentTime = inPoint;
      }
    };

    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('timeupdate',     onTime);
    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('timeupdate',     onTime);
    };
  }, []);

  const seekTo      = useCallback((t: number) => { if (videoRef.current) videoRef.current.currentTime = t; }, []);
  const markIn      = useCallback(() => { if (videoRef.current) setTrim(p => ({ ...p, inPoint:  videoRef.current!.currentTime })); }, []);
  const markOut     = useCallback(() => { if (videoRef.current) setTrim(p => ({ ...p, outPoint: videoRef.current!.currentTime })); }, []);

  const pct = (t: number) => duration > 0 ? (t / duration) * 100 : 0;

  // drag helpers for timeline handles
  const startDrag = (
    e:       React.MouseEvent,
    which:   'in' | 'out',
  ) => {
    e.stopPropagation();
    const track = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    const onMove = (me: MouseEvent) => {
      const rect = track.getBoundingClientRect();
      const t    = Math.max(0, Math.min(duration, ((me.clientX - rect.left) / rect.width) * duration));
      setTrim(prev => {
        if (which === 'in')  return { ...prev, inPoint:  Math.min(t, prev.outPoint  - 0.1) };
        return                       { ...prev, outPoint: Math.max(t, prev.inPoint + 0.1) };
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

      <video
        ref={videoRef}
        src="/videos/scene_01.mp4"
        muted playsInline preload="auto"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position:     'absolute',
          bottom:       open ? 164 : 10,
          right:        12,
          padding:      '4px 10px',
          fontSize:     11,
          fontFamily:   'monospace',
          background:   'rgba(0,0,0,0.55)',
          color:        open ? '#4af' : '#888',
          border:       '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          cursor:       'pointer',
          transition:   'bottom 0.2s',
          zIndex:       10,
        }}
      >
        {open ? '✕ trim' : '✂ trim'}
      </button>

      {/* trim panel */}
      {open && duration > 0 && (
        <div style={{
          position:       'absolute',
          bottom:         0,
          left:           0,
          right:          0,
          padding:        '12px 18px 14px',
          background:     'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(10px)',
          fontFamily:     'monospace',
          fontSize:       11,
          color:          '#bbb',
          zIndex:         9,
        }}>

          {/* time labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#4af' }}>IN &nbsp;{fmt(trim.inPoint)}</span>
            <span style={{ color: '#fa4' }}>▶ {fmt(current)}</span>
            <span style={{ color: '#f84' }}>OUT {fmt(trim.outPoint)}</span>
          </div>

          {/* timeline */}
          <div
            style={{ position: 'relative', height: 32, cursor: 'pointer' }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - rect.left) / rect.width) * duration);
            }}
          >
            {/* track */}
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0,
              height: 3, transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.12)', borderRadius: 2,
            }} />

            {/* active range */}
            <div style={{
              position:   'absolute',
              top:        '50%',
              left:       `${pct(trim.inPoint)}%`,
              width:      `${pct(trim.outPoint) - pct(trim.inPoint)}%`,
              height:     3,
              transform:  'translateY(-50%)',
              background: 'rgba(100,180,255,0.45)',
              borderRadius: 2,
              pointerEvents: 'none',
            }} />

            {/* playhead */}
            <div style={{
              position:      'absolute',
              left:          `${pct(current)}%`,
              top:           '50%',
              transform:     'translate(-50%,-50%)',
              width:         2,
              height:        22,
              background:    '#fa4',
              borderRadius:  1,
              pointerEvents: 'none',
            }} />

            {/* IN handle */}
            <div
              onMouseDown={e => startDrag(e, 'in')}
              style={{
                position:     'absolute',
                left:         `${pct(trim.inPoint)}%`,
                top:          '50%',
                transform:    'translate(-50%,-50%)',
                width:        10,
                height:       22,
                background:   '#4af',
                borderRadius: 3,
                cursor:       'ew-resize',
                zIndex:       2,
              }}
            />

            {/* OUT handle */}
            <div
              onMouseDown={e => startDrag(e, 'out')}
              style={{
                position:     'absolute',
                left:         `${pct(trim.outPoint)}%`,
                top:          '50%',
                transform:    'translate(-50%,-50%)',
                width:        10,
                height:       22,
                background:   '#f84',
                borderRadius: 3,
                cursor:       'ew-resize',
                zIndex:       2,
              }}
            />
          </div>

          {/* buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={markIn}               style={btn('#4af')}>[  Mark In</button>
            <button onClick={markOut}              style={btn('#f84')}>Mark Out  ]</button>
            <button onClick={() => seekTo(trim.inPoint)} style={btn('#aaa')}>⏮ seek to IN</button>
          </div>

        </div>
      )}

    </div>
  );
}
