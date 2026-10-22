import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  selectCurrentTask,
  selectNextTask,
  selectCurrentTaskIndex,
  selectSessionTasks,
  selectStartedAt,
  selectIsRunning,
  setPiPMode,
  nextTask,
  stopSession,
} from '../store/clockSlice';

/**
 * Draggable floating mini-clock.
 * Rendered globally in App.jsx so it persists across page navigation.
 * Shows a mini dot-ring indicator + task name + live countdown.
 */
const PipWidget = () => {
  const dispatch   = useDispatch();
  const isRunning  = useSelector(selectIsRunning);
  const task       = useSelector(selectCurrentTask);
  const nextT      = useSelector(selectNextTask);
  const idx        = useSelector(selectCurrentTaskIndex);
  const tasks      = useSelector(selectSessionTasks);
  const startedAt  = useSelector(selectStartedAt);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef(null);

  const compute = useCallback(() => {
    if (!task || !startedAt) return 0;
    const prevMin = tasks.slice(0, idx).reduce((s, t) => s + t.durationMinutes, 0);
    const end     = new Date(startedAt).getTime() + (prevMin + task.durationMinutes) * 60 * 1000;
    return Math.max(0, Math.round((end - Date.now()) / 1000));
  }, [task, startedAt, tasks, idx]);

  useEffect(() => { if (task) setSecondsLeft(compute()); }, [task, compute]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!task || !isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((p) => {
        if (p <= 1) { clearInterval(intervalRef.current); dispatch(nextTask()); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [task, isRunning, dispatch]);

  if (!isRunning || !task) return null;

  const color     = task.color || '#6366f1';
  const total     = task.durationMinutes * 60;
  const progress  = Math.min(100, ((total - secondsLeft) / total) * 100);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  // SVG mini ring (60 dots, 120px)
  const S = 120, cx = 60, cy = 60, R = 44;
  const now = new Date();
  const secFrac = (now.getSeconds() / 60) * 2 * Math.PI - Math.PI / 2 + (Date.now() % 1000) / 1000 * (2 * Math.PI / 60);
  const progCirc = 2 * Math.PI * 48;
  const progDash = (progress / 100) * progCirc;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={{ opacity: 0, scale: 0.85, x: 0, y: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="fixed bottom-6 right-6 z-[200] cursor-move select-none"
      style={{ touchAction: 'none' }}
    >
      <div
        className="glass-card overflow-hidden shadow-2xl"
        style={{
          width: 220,
          border: `1px solid ${color}35`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${color}18`,
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-white/8 cursor-move"
          style={{ background: `${color}12` }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-400 font-medium">
              {idx + 1}/{tasks.length}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch(setPiPMode(false)); }}
            className="text-gray-500 hover:text-white transition-colors text-xs leading-none p-0.5"
          >
            ✕
          </button>
        </div>

        {/* Mini clock body */}
        <div className="flex flex-col items-center py-3 px-3 gap-1">

          {/* SVG ring progress */}
          <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
            {/* Track */}
            <circle cx={cx} cy={cy} r={48} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            {/* Progress */}
            {progress > 0 && (
              <circle cx={cx} cy={cy} r={48} fill="none"
                stroke={color} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${progDash} ${progCirc}`}
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity="0.7"
              />
            )}
            {/* 12 dot ticks */}
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * 30 - 90) * Math.PI / 180;
              return (
                <circle key={i}
                  cx={cx + R * Math.cos(a)}
                  cy={cy + R * Math.sin(a)}
                  r="2.5"
                  fill="rgba(255,255,255,0.18)"
                />
              );
            })}
            {/* Second indicator */}
            <circle
              cx={cx + R * Math.cos(secFrac)}
              cy={cy + R * Math.sin(secFrac)}
              r="5"
              fill={color}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
            {/* Center: countdown */}
            <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central"
              fill="rgba(255,255,255,0.9)" fontSize="16" fontWeight="700"
              fontFamily="JetBrains Mono, monospace">
              {mm}:{ss}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle"
              fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="Inter,sans-serif">
              remaining
            </text>
          </svg>

          {/* Task name */}
          <p
            className="text-center font-semibold leading-tight mt-0.5"
            style={{
              color,
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontSize: 13,
              maxWidth: '100%',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {task.title}
          </p>

          {nextT && (
            <p className="text-gray-600 text-xs text-center mt-0.5">
              Next: {nextT.title}
            </p>
          )}

          {/* Controls */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => dispatch(nextTask())}
              disabled={idx >= tasks.length - 1}
              className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30"
            >
              Skip ⏭
            </button>
            <button
              onClick={() => { dispatch(stopSession()); }}
              className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
            >
              End ⏹
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PipWidget;
