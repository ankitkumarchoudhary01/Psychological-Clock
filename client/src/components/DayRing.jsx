import { useSelector } from 'react-redux';
import { selectTasks } from '../store/tasksSlice';

const TOTAL_MINUTES = 1440; // 24 hours
const RADIUS = 110;
const STROKE_WIDTH = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = 300;
const CENTER = SIZE / 2;

const formatTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const DayRing = () => {
  const tasks = useSelector(selectTasks);
  const totalTaskMinutes = tasks.reduce((s, t) => s + t.durationMinutes, 0);
  const freeMinutes = TOTAL_MINUTES - totalTaskMinutes;

  // Build arc segments
  const segments = [
    ...tasks.map((t) => ({ label: t.title, minutes: t.durationMinutes, color: t.color })),
    ...(freeMinutes > 0 ? [{ label: 'Free time', minutes: freeMinutes, color: '#1f2937' }] : []),
  ];

  // Calculate stroke-dasharray / stroke-dashoffset for each segment
  let accumulated = 0;
  const arcs = segments.map((seg) => {
    const fraction = seg.minutes / TOTAL_MINUTES;
    const dashLength = fraction * CIRCUMFERENCE;
    const offset = CIRCUMFERENCE - accumulated;
    accumulated += dashLength;
    return { ...seg, dashLength, offset };
  });

  return (
    <div className="flex flex-col items-center">
      {/* SVG Ring */}
      <div className="relative">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Background track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#1f2937"
            strokeWidth={STROKE_WIDTH}
          />

          {/* Task arcs — rotate so 12 o'clock is start */}
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${arc.dashLength} ${CIRCUMFERENCE - arc.dashLength}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
              />
            ))}
          </g>

          {/* Center text */}
          <text
            x={CENTER}
            y={CENTER - 10}
            textAnchor="middle"
            fill="#fff"
            fontSize="22"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {formatTime(totalTaskMinutes)}
          </text>
          <text
            x={CENTER}
            y={CENTER + 14}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="12"
            fontFamily="Inter, sans-serif"
          >
            scheduled
          </text>
          {freeMinutes > 0 && (
            <text
              x={CENTER}
              y={CENTER + 32}
              textAnchor="middle"
              fill="#4b5563"
              fontSize="11"
              fontFamily="Inter, sans-serif"
            >
              {formatTime(freeMinutes)} free
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      {tasks.length > 0 && (
        <div className="mt-4 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <div key={task._id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: task.color }}
                />
                <span className="text-gray-300 text-sm truncate">{task.title}</span>
              </div>
              <span className="text-gray-500 text-xs font-mono flex-shrink-0">
                {formatTime(task.durationMinutes)}
              </span>
            </div>
          ))}
          {freeMinutes > 0 && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-800 border border-gray-600" />
                <span className="text-gray-500 text-sm">Free time</span>
              </div>
              <span className="text-gray-600 text-xs font-mono">{formatTime(freeMinutes)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DayRing;
