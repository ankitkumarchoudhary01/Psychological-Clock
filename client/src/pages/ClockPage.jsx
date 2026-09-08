import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnalogClock from '../components/AnalogClock';
import TaskOverlay from '../components/TaskOverlay';
import {
  selectCurrentTask,
  selectNextTask,
  selectIsRunning,
  selectCurrentTaskIndex,
  selectSessionTasks,
  selectStartedAt,
  nextTask,
  prevTask,
  stopSession,
  selectIsSessionComplete,
} from '../store/clockSlice';

// Play a short beep using Web Audio API
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  } catch (_) {
    // Audio not supported — silent fallback
  }
};

const ClockPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isRunning = useSelector(selectIsRunning);
  const currentTask = useSelector(selectCurrentTask);
  const nextTaskItem = useSelector(selectNextTask);
  const currentIndex = useSelector(selectCurrentTaskIndex);
  const sessionTasks = useSelector(selectSessionTasks);
  const startedAt = useSelector(selectStartedAt);
  const isComplete = useSelector(selectIsSessionComplete);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef(null);

  // If no session running, redirect back
  useEffect(() => {
    if (!isRunning && sessionTasks.length === 0) {
      navigate('/', { replace: true });
    }
  }, [isRunning, sessionTasks, navigate]);

  // Compute seconds left for current task
  const computeSecondsLeft = useCallback(() => {
    if (!currentTask || !startedAt) return 0;
    // Sum durations of tasks before current
    const previousMinutes = sessionTasks
      .slice(0, currentIndex)
      .reduce((s, t) => s + t.durationMinutes, 0);
    const taskStartMs = new Date(startedAt).getTime() + previousMinutes * 60 * 1000;
    const taskEndMs = taskStartMs + currentTask.durationMinutes * 60 * 1000;
    const remaining = Math.max(0, Math.round((taskEndMs - Date.now()) / 1000));
    return remaining;
  }, [currentTask, startedAt, sessionTasks, currentIndex]);

  // Reset timer when task changes
  useEffect(() => {
    if (!currentTask) return;
    setSecondsLeft(computeSecondsLeft());
  }, [currentTask, computeSecondsLeft]);

  // Countdown interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!currentTask || !isRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          playBeep();
          setTimeout(() => dispatch(nextTask()), 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [currentTask, isRunning, dispatch]);

  // Escape key exits
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleExit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handleExit = () => {
    dispatch(stopSession());
    navigate('/');
    toast('Session ended.', { icon: '👋' });
  };

  const handleNext = () => {
    playBeep();
    dispatch(nextTask());
  };

  const handlePrev = () => {
    dispatch(prevTask());
  };

  // Progress percent for the arc on the clock
  const totalTaskSeconds = currentTask ? currentTask.durationMinutes * 60 : 1;
  const progressPercent = currentTask
    ? Math.min(100, ((totalTaskSeconds - secondsLeft) / totalTaskSeconds) * 100)
    : 0;

  const taskColor = currentTask?.color || '#6366f1';

  // Session complete screen
  if (isComplete && !isRunning) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-6 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-white mb-2">Session Complete!</h1>
          <p className="text-gray-400 text-lg">
            You completed {sessionTasks.length} task{sessionTasks.length !== 1 ? 's' : ''}.
            Amazing focus!
          </p>
          <button
            onClick={() => { dispatch(stopSession()); navigate('/'); }}
            className="btn-primary mt-8 text-base px-8 py-3"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${taskColor}08 0%, #0a0a0f 70%)`,
        transition: 'background 1s ease',
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <div className="text-gray-500 text-sm font-mono">
          {currentIndex + 1} / {sessionTasks.length}
        </div>
        <button
          onClick={handleExit}
          title="Exit session (Esc)"
          className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Clock + Overlay container */}
      <div className="relative flex items-center justify-center" style={{ width: '80vmin', height: '80vmin' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full flex items-center justify-center"
          >
            <AnalogClock
              size={Math.min(window.innerWidth, window.innerHeight) * 0.72}
              taskColor={taskColor}
              progressPercent={progressPercent}
            />
          </motion.div>
        </AnimatePresence>

        {/* Text overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <TaskOverlay secondsLeft={secondsLeft} />
        </div>
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-8 flex items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous task"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex gap-1.5">
          {sessionTasks.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i === currentIndex ? taskColor : 'rgba(255,255,255,0.2)',
                transform: i === currentIndex ? 'scale(1.5)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === sessionTasks.length - 1}
          className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next task"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Hint */}
      <p className="absolute bottom-2 text-gray-700 text-xs">Press Esc to exit</p>
    </div>
  );
};

export default ClockPage;
