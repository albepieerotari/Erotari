'use client';

interface Props {
  scrollProgress: number;
}

export default function TextOverlay({ scrollProgress }: Props) {
  const showYour = scrollProgress > 0.15;

  return (
    <div
      style={{
        position:      'absolute',
        top:           '50%',
        left:          '58%',
        transform:     'translateY(-50%)',
        fontFamily:    'Georgia, serif',
        fontSize:      'clamp(11px, 1.1vw, 14px)',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color:         'rgba(255,255,255,0.42)',
        pointerEvents: 'none',
        whiteSpace:    'nowrap',
        transition:    'opacity 1s ease',
      }}
    >
      <span
        style={{
          display:    'block',
          opacity:    showYour ? 0 : 1,
          transition: 'opacity 0.9s ease',
        }}
      >
        This is Time
      </span>
      <span
        style={{
          display:    'block',
          opacity:    showYour ? 1 : 0,
          transition: 'opacity 0.9s ease',
          marginTop:  '-1.4em',
        }}
      >
        This is Your Time
      </span>
    </div>
  );
}