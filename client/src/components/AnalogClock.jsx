import { useState, useEffect, useRef } from 'react';

/**
 * Dot-ring clock:
 * • 60 dots — hour (amber), minute (white), rest (dim)
 * • Smooth second indicator via requestAnimationFrame
 * • Task name in center using Playfair Display (no hands, no numbers, no center dot)
 * • isVisible prop for hide/show transition
 */
const AnalogClock = ({
  size = 380,
  taskColor = '#6366f1',
  progressPercent = 0,
  taskName = '',
  isVisible = true,
}) => {
  const [time, setTime]       = useState(new Date());
  const [secAngle, setSecAngle] = useState(-90);
  const secAngleRef           = useRef(-90);
  const rafRef                = useRef(null);

  // Tick every second for hour / minute dot positions
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // RAF for smooth second indicator
  useEffect(() => {
    const tick = () => {
      const ms  = Date.now() % 60000;
      const angle = (ms / 60000) * 360 - 90; // -90 → 12 o'clock
      if (Math.abs(angle - secAngleRef.current) > 0.04) {
        secAngleRef.current = angle;
        setSecAngle(angle);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const min   = time.getMinutes();
  const hr12  = time.getHours() % 12;
  const hourPos = (hr12 * 5 + Math.floor(min / 12)) % 60;
  const minPos  = min;

  const cx = size / 2;
  const cy = size / 2;
  const dotRingR  = size * 0.39;
  const progressR = size * 0.47;
  const innerR    = dotRingR - size * 0.068;

  // Progress arc
  const progCirc  = 2 * Math.PI * progressR;
  const progDash  = (Math.min(progressPercent, 100) / 100) * progCirc;

  // Smooth second indicator position
  const secRad = (secAngle * Math.PI) / 180;
  const secX   = cx + dotRingR * Math.cos(secRad);
  const secY   = cy + dotRingR * Math.sin(secRad);

  // 60 static dots
  const dots = Array.from({ length: 60 }, (_, i) => {
    const angleDeg = i * 6 - 90;
    const rad = (angleDeg * Math.PI) / 180;
    const x = cx + dotRingR * Math.cos(rad);
    const y = cy + dotRingR * Math.sin(rad);

    const isMin   = i === minPos;
    const isHour  = i === hourPos;
    const isMajor = i % 5 === 0;

    let fill, r;
    if (isMin)        { fill = '#fff';              r = size * 0.022; }
    else if (isHour)  { fill = '#f59e0b';           r = size * 0.021; }
    else if (isMajor) { fill = 'rgba(255,255,255,0.2)'; r = size * 0.011; }
    else              { fill = 'rgba(255,255,255,0.06)'; r = size * 0.007; }

    return { x, y, fill, r };
  });

  // Clamp font size so long names stay inside the inner circle
  const maxFontPx = Math.min(size * 0.085, 34);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        opacity:    isVisible ? 1 : 0,
        transition: 'opacity 0.45s ease',
        filter: `drop-shadow(0 0 ${size * 0.07}px ${taskColor}16)`,
      }}
    >
      {/* Outer accent ring */}
      <circle cx={cx} cy={cy} r={progressR + size * 0.028}
        fill="none" stroke={taskColor} strokeWidth="0.5" opacity="0.1" />

      {/* Task progress arc */}
      {progressPercent > 0 && (
        <circle cx={cx} cy={cy} r={progressR}
          fill="none"
          stroke={taskColor}
          strokeWidth={size * 0.013}
          strokeLinecap="round"
          strokeDasharray={`${progDash} ${progCirc}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity="0.6"
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />
      )}

      {/* Clock face */}
      <circle cx={cx} cy={cy} r={innerR}
        fill="#0c0c18"
        stroke={`${taskColor}14`}
        strokeWidth="1"
      />

      {/* 60 static dots */}
      {dots.map(({ x, y, fill, r }, i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={fill} />
      ))}

      {/* Smooth second indicator (separate moving dot) */}
      <circle
        cx={secX} cy={secY}
        r={size * 0.028}
        fill={taskColor}
        style={{ filter: `drop-shadow(0 0 ${size * 0.02}px ${taskColor})` }}
      />

      {/* ── Task name in center via foreignObject ── */}
      {taskName && (
        <foreignObject
          x={cx - innerR * 0.8}
          y={cy - innerR * 0.42}
          width={innerR * 1.6}
          height={innerR * 0.84}
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width:          '100%',
              height:         '100%',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              textAlign:      'center',
              color:          'rgba(255,255,255,0.95)',
              fontSize:       `${maxFontPx}px`,
              fontWeight:     '800',
              fontFamily:     '"Playfair Display", Georgia, serif',
              fontStyle:      'italic',
              lineHeight:     '1.2',
              letterSpacing:  '-0.01em',
              textShadow:     `0 0 28px ${taskColor}80, 0 2px 12px rgba(0,0,0,0.5)`,
              wordBreak:      'break-word',
              overflow:       'hidden',
              userSelect:     'none',
            }}
          >
            {taskName}
          </div>
        </foreignObject>
      )}
      {/* No center dot — intentionally removed */}
    </svg>
  );
};

export default AnalogClock;
