import { useState, useEffect, useCallback } from 'react';

const AnalogClock = ({ size = 380, taskColor = '#6366f1', progressPercent = 0 }) => {
  const [time, setTime] = useState(new Date());

  // Update every second
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  // Degrees
  const secDeg = seconds * 6;                          // 0-360 in 60s
  const minDeg = minutes * 6 + seconds * 0.1;          // smooth
  const hourDeg = hours * 30 + minutes * 0.5;          // smooth

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8; // outer ring radius

  // Progress arc (task completion)
  const PROGRESS_R = r + 4;
  const PROGRESS_CIRC = 2 * Math.PI * PROGRESS_R;
  const progressDash = (progressPercent / 100) * PROGRESS_CIRC;

  // Helper: polar to cartesian
  const polar = useCallback(
    (angleDeg, radius) => {
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
    },
    [cx, cy]
  );

  // Hour tick marks
  const hourTicks = Array.from({ length: 12 }, (_, i) => {
    const deg = i * 30;
    const outer = polar(deg, r - 4);
    const inner = polar(deg, r - 18);
    return { outer, inner, deg };
  });

  // Minute tick marks
  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    const deg = i * 6;
    if (i % 5 === 0) return null; // skip where hour ticks are
    const outer = polar(deg, r - 4);
    const inner = polar(deg, r - 10);
    return { outer, inner };
  }).filter(Boolean);

  // Hour numbers
  const hourNumbers = Array.from({ length: 12 }, (_, i) => {
    const num = i === 0 ? 12 : i;
    const deg = i * 30;
    const pos = polar(deg, r - 32);
    return { num, pos };
  });

  // Hand line builder
  const handLine = (deg, length, baseOffset = 18) => {
    const tip = polar(deg, length);
    const base = polar(deg + 180, baseOffset);
    return { x1: base.x, y1: base.y, x2: tip.x, y2: tip.y };
  };

  const hourHand = handLine(hourDeg, r * 0.5);
  const minHand = handLine(minDeg, r * 0.7);
  const secHand = handLine(secDeg, r * 0.85, 24);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ filter: 'drop-shadow(0 0 40px rgba(99,102,241,0.2))' }}
    >
      {/* Outer glow ring */}
      <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke={taskColor} strokeWidth="1" opacity="0.15" />

      {/* Progress arc (task completion) — goes clockwise from 12 o'clock */}
      <circle
        cx={cx}
        cy={cy}
        r={PROGRESS_R}
        fill="none"
        stroke={taskColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${progressDash} ${PROGRESS_CIRC}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity="0.7"
        style={{ transition: 'stroke-dasharray 1s linear' }}
      />

      {/* Clock face background */}
      <circle cx={cx} cy={cy} r={r} fill="#0f0f1a" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Inner subtle ring */}
      <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

      {/* Minute tick marks */}
      {minuteTicks.map((tick, i) => (
        <line
          key={i}
          x1={tick.outer.x} y1={tick.outer.y}
          x2={tick.inner.x} y2={tick.inner.y}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      ))}

      {/* Hour tick marks */}
      {hourTicks.map((tick, i) => (
        <line
          key={i}
          x1={tick.outer.x} y1={tick.outer.y}
          x2={tick.inner.x} y2={tick.inner.y}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}

      {/* Hour numbers */}
      {hourNumbers.map(({ num, pos }) => (
        <text
          key={num}
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.7)"
          fontSize={size * 0.06}
          fontFamily="Inter, sans-serif"
          fontWeight="500"
        >
          {num}
        </text>
      ))}

      {/* Hour hand */}
      <line
        x1={hourHand.x1} y1={hourHand.y1}
        x2={hourHand.x2} y2={hourHand.y2}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={size * 0.025}
        strokeLinecap="round"
        style={{ transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />

      {/* Minute hand */}
      <line
        x1={minHand.x1} y1={minHand.y1}
        x2={minHand.x2} y2={minHand.y2}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={size * 0.016}
        strokeLinecap="round"
        style={{ transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />

      {/* Second hand */}
      <line
        x1={secHand.x1} y1={secHand.y1}
        x2={secHand.x2} y2={secHand.y2}
        stroke={taskColor}
        strokeWidth={size * 0.007}
        strokeLinecap="round"
        style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />

      {/* Center cap — outer */}
      <circle cx={cx} cy={cy} r={size * 0.035} fill={taskColor} />
      {/* Center cap — inner white dot */}
      <circle cx={cx} cy={cy} r={size * 0.012} fill="white" />
    </svg>
  );
};

export default AnalogClock;
