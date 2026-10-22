import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnalogClock   from '../components/AnalogClock';
import TaskOverlay   from '../components/TaskOverlay';
import { addSession } from '../store/historySlice';
import {
  selectCurrentTask, selectNextTask, selectIsRunning,
  selectCurrentTaskIndex, selectSessionTasks, selectStartedAt,
  selectIsSessionComplete,
  nextTask, prevTask, stopSession,
  restartCurrentTask, saveProgress, setPiPMode,
} from '../store/clockSlice';

/* ── Beep ──────────────────────────────────────────────────────────────────── */
const beep = (f = 880, d = 1.2) => {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
    osc.start(); osc.stop(ctx.currentTime + d);
  } catch (_) {}
};

/* ── Break suggestions ──────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  { e: '🚻', l: 'Washroom' }, { e: '💧', l: 'Water break' },
  { e: '👁️', l: 'Eye rest'  }, { e: '📱', l: 'Phone call'  },
  { e: '🤸', l: 'Stretching'}, { e: '🍎', l: 'Snack break' },
  { e: '☕', l: 'Coffee'    }, { e: '🧘', l: 'Breathing'   },
];

const fmt = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ── Icons ──────────────────────────────────────────────────────────────────── */
const IC = ({ d, solid }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24"
    fill={solid ? 'currentColor' : 'none'}
    stroke={solid ? 'none' : 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IPlay     = () => <IC d="M8 5v14l11-7z" solid />;
const IRestart  = () => <IC d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;
const INext     = () => <IC d="M9 5l7 7-7 7" />;
const IPrev     = () => <IC d="M15 19l-7-7 7-7" />;
const ICoffee   = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
  </svg>
);
const IEye      = () => <IC d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />;
const IEyeOff   = () => <IC d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />;
const IFullscreen = () => <IC d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />;
const IExitFS   = () => <IC d="M9 9V4m0 5H4m5 0L3 3m12 6V4m0 5h5m-5 0l6-6M9 15v5m0-5H4m5 0l-6 6m12-6h5m-5 0v5m0-5l6 6" />;
const IPiP      = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" stroke="none" opacity="0.4" />
  </svg>
);

/* ── Break Dialog ──────────────────────────────────────────────────────────── */
const BreakDialog = ({ onResume, elapsed }) => {
  const [reason, setReason] = useState('');
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="glass-card p-7 w-full max-w-md"
      >
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🌿</div>
          <h2 className="text-xl font-bold text-white">Taking a Break</h2>
          <p className="text-gray-500 text-sm mt-1">Main timer is still running</p>
          <div className="mt-3 text-2xl font-mono font-bold text-amber-400">{fmt(elapsed)}</div>
        </div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Quick select</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button key={s.l} onClick={() => setReason(s.l)}
              className={`px-3 py-1.5 rounded-xl text-sm border transition-all
                ${reason === s.l
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >{s.e} {s.l}</button>
          ))}
        </div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Or type</p>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="What are you doing?" className="input-field mb-5" maxLength={80} autoFocus />
        <button onClick={() => onResume(reason || 'Unspecified break')}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          <IPlay /> Resume Session
        </button>
      </motion.div>
    </motion.div>
  );
};

/* ── Task Complete Modal ───────────────────────────────────────────────────── */
const CompleteModal = ({ done, next, countdown, onStartNow, onBreakFirst }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
  >
    <motion.div
      initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.88, y: 24 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="glass-card p-7 w-full max-w-sm text-center"
    >
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: `${done?.color || '#10b981'}18`, border: `2px solid ${done?.color || '#10b981'}40` }}>
          ✅
        </div>
      </div>
      <h2 className="text-xl font-bold text-white mb-1">Task Complete!</h2>
      <p className="text-gray-400 text-sm mb-5">
        <span className="font-semibold" style={{ color: done?.color }}>{done?.title}</span> is done.
      </p>
      {next ? (
        <>
          <div className="glass-card p-4 mb-4 text-left">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Up next</p>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: next.color }} />
              <div>
                <p className="text-white font-semibold" style={{ fontFamily: '"Playfair Display",serif', fontStyle:'italic' }}>{next.title}</p>
                <p className="text-gray-500 text-xs font-mono">{next.durationMinutes >= 60 ? `${Math.floor(next.durationMinutes/60)}h ` : ''}{next.durationMinutes % 60 > 0 ? `${next.durationMinutes % 60}m` : ''}</p>
              </div>
            </div>
          </div>
          <button onClick={onStartNow} className="btn-primary w-full mb-2 flex items-center justify-center gap-2">
            <IPlay /> Start Now {countdown > 0 && <span className="text-white/50 text-sm">({countdown})</span>}
          </button>
          <button onClick={onBreakFirst} className="btn-ghost w-full text-sm">
            ☕ Take a break first
          </button>
        </>
      ) : (
        <button onClick={onStartNow} className="btn-primary w-full">🎉 Back to Dashboard</button>
      )}
    </motion.div>
  </motion.div>
);

/* ── End Task Dialog ───────────────────────────────────────────────────────── */
const EndTaskDialog = ({ task, nextTask: nt, onNext, onEndAll, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-lg"
  >
    <motion.div
      initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.92 }}
      className="glass-card p-6 w-full max-w-xs text-center"
    >
      <div className="text-3xl mb-3">⏭</div>
      <h3 className="text-lg font-bold text-white mb-1">Skip this task?</h3>
      <p className="text-gray-400 text-sm mb-5">
        <span style={{ color: task?.color, fontStyle: 'italic', fontFamily: '"Playfair Display",serif' }}>{task?.title}</span>
      </p>
      {nt && (
        <div className="flex items-center gap-2 glass-card px-3 py-2 mb-4 text-left">
          <div className="w-2 h-2 rounded-full" style={{ background: nt.color }} />
          <span className="text-gray-300 text-sm">{nt.title}</span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {nt && (
          <button onClick={onNext} className="btn-primary flex items-center justify-center gap-2">
            <INext /> Next Task
          </button>
        )}
        <button onClick={onEndAll} className="btn-ghost text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-400/30">
          End Entire Session
        </button>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-sm py-1 transition-colors">
          Cancel
        </button>
      </div>
    </motion.div>
  </motion.div>
);

/* ══════════════════════════════════════════════════════════════════════════════
   CLOCK PAGE
══════════════════════════════════════════════════════════════════════════════ */
const ClockPage = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();

  const isRunning     = useSelector(selectIsRunning);
  const currentTask   = useSelector(selectCurrentTask);
  const nextT         = useSelector(selectNextTask);
  const currentIndex  = useSelector(selectCurrentTaskIndex);
  const sessionTasks  = useSelector(selectSessionTasks);
  const startedAt     = useSelector(selectStartedAt);
  const isComplete    = useSelector(selectIsSessionComplete);

  /* ── Local state ── */
  const [secondsLeft,     setSecondsLeft]    = useState(0);
  const [isClockVisible,  setClockVisible]   = useState(true);
  const [isFullscreen,    setIsFullscreen]   = useState(!!document.fullscreenElement);
  const [isOnBreak,       setIsOnBreak]      = useState(false);
  const [breakStart,      setBreakStart]     = useState(null);
  const [breakElapsed,    setBreakElapsed]   = useState(0);
  const [breaks,          setBreaks]         = useState([]);
  const [showComplete,    setShowComplete]   = useState(false);
  const [autoAdvance,     setAutoAdvance]    = useState(5);
  const [completedTask,   setCompletedTask]  = useState(null);
  const [showEndDialog,   setShowEndDialog]  = useState(false);
  const intervalRef = useRef(null);
  const sessionStartRef = useRef(new Date().toISOString());

  /* ── Redirect if no session ── */
  useEffect(() => {
    if (!isRunning && sessionTasks.length === 0 && !isComplete) navigate('/', { replace: true });
  }, [isRunning, sessionTasks, isComplete, navigate]);

  /* ── Compute seconds left ── */
  const computeSec = useCallback(() => {
    if (!currentTask || !startedAt) return 0;
    const prevMin = sessionTasks.slice(0, currentIndex).reduce((s, t) => s + t.durationMinutes, 0);
    const end     = new Date(startedAt).getTime() + (prevMin + currentTask.durationMinutes) * 60 * 1000;
    return Math.max(0, Math.round((end - Date.now()) / 1000));
  }, [currentTask, startedAt, sessionTasks, currentIndex]);

  useEffect(() => { if (currentTask) setSecondsLeft(computeSec()); }, [currentTask, computeSec]);

  /* ── Countdown (always runs — breaks don't stop it) ── */
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!currentTask || !isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((p) => {
        if (p <= 1) {
          clearInterval(intervalRef.current);
          beep(880, 1.5);
          setCompletedTask(currentTask);
          setShowComplete(true);
          setAutoAdvance(5);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [currentTask, isRunning]);

  /* ── Auto-advance ── */
  useEffect(() => {
    if (!showComplete) return;
    if (autoAdvance <= 0) { setShowComplete(false); dispatch(nextTask()); return; }
    const t = setTimeout(() => setAutoAdvance((a) => a - 1), 1000);
    return () => clearTimeout(t);
  }, [showComplete, autoAdvance, dispatch]);

  /* ── Break elapsed ── */
  useEffect(() => {
    if (!isOnBreak || !breakStart) return;
    const id = setInterval(() => setBreakElapsed(Math.round((Date.now() - breakStart) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isOnBreak, breakStart]);

  /* ── Fullscreen change listener ── */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* ── Save progress on beforeunload ── */
  useEffect(() => {
    const handler = () => dispatch(saveProgress(secondsLeft));
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [secondsLeft, dispatch]);

  /* ── Escape → exit ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isOnBreak && !showComplete && !showEndDialog) {
        if (document.fullscreenElement) document.exitFullscreen();
        else persistAndExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ── Save session history ── */
  const recordSession = useCallback((status) => {
    const focusSec  = sessionTasks.reduce((s, t) => s + t.durationMinutes * 60, 0) - secondsLeft;
    const breakSec  = breaks.reduce((s, b) => s + b.durationSeconds, 0);
    dispatch(addSession({
      id:                  Date.now().toString(),
      date:                new Date().toISOString().slice(0, 10),
      startedAt:           sessionStartRef.current,
      endedAt:             new Date().toISOString(),
      tasks:               sessionTasks.map(({ _id, title, durationMinutes, color }) => ({ _id, title, durationMinutes, color })),
      completedTaskCount:  currentIndex + (status === 'completed' ? 1 : 0),
      breaks,
      totalFocusSeconds:   Math.max(0, focusSec),
      totalBreakSeconds:   breakSec,
      wasCompleted:        status === 'completed',
    }));
  }, [sessionTasks, breaks, currentIndex, secondsLeft, dispatch]);

  /* ── Break helpers ── */
  const openBreak = () => {
    setBreakStart(Date.now()); setBreakElapsed(0); setIsOnBreak(true); setClockVisible(false);
  };
  const closeBreak = (reason) => {
    const dur = Math.round((Date.now() - breakStart) / 1000);
    setBreaks((p) => [...p, { reason, durationSeconds: dur, startedAt: new Date(breakStart).toISOString() }]);
    setIsOnBreak(false); setClockVisible(true);
    toast.success(`Break: ${reason} (${fmt(dur)})`);
  };

  /* ── Controls ── */
  const persistAndExit = () => {
    dispatch(saveProgress(secondsLeft));
    recordSession('partial');
    dispatch(stopSession());
    navigate('/');
    toast('Session saved. Resume anytime.', { icon: '💾' });
  };

  const handleEndClick = () => setShowEndDialog(true);

  const handleEndAll = () => {
    setShowEndDialog(false);
    persistAndExit();
  };

  const handleNextFromEndDialog = () => {
    setShowEndDialog(false);
    beep(660, 0.5);
    dispatch(nextTask());
  };

  const handleRestartCurrent = () => {
    dispatch(restartCurrentTask());
    toast('Task restarted.', { icon: '🔄' });
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const handlePiP = () => {
    dispatch(saveProgress(secondsLeft));
    dispatch(setPiPMode(true));
    navigate('/');
    toast('Clock is now floating! Navigate freely.', { icon: '🪟' });
  };

  const handleStartNow = () => { setShowComplete(false); dispatch(nextTask()); };
  const handleBreakFirst = () => { setShowComplete(false); dispatch(nextTask()); setTimeout(openBreak, 150); };

  const color         = currentTask?.color || '#6366f1';
  const totalSec      = currentTask ? currentTask.durationMinutes * 60 : 1;
  const progress      = currentTask ? Math.min(100, ((totalSec - secondsLeft) / totalSec) * 100) : 0;
  const clockSize     = Math.round(Math.min(window.innerWidth * 0.76, window.innerHeight * 0.62));

  /* ── Session complete screen ── */
  if (isComplete && !isRunning) {
    recordSession('completed');
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-5 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-white mb-2">Session Complete!</h1>
          <p className="text-gray-400 text-lg">You completed {sessionTasks.length} tasks.</p>
          {breaks.length > 0 && (
            <div className="glass-card p-4 mt-5 text-left max-w-sm mx-auto">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Break Log</p>
              {breaks.map((b, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5">
                  <span className="text-gray-300">{b.reason}</span>
                  <span className="text-gray-500 font-mono">{fmt(b.durationSeconds)}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { dispatch(stopSession()); navigate('/'); }} className="btn-primary mt-8 px-8 py-3 text-base">
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Main clock screen ── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: `radial-gradient(ellipse at center, ${color}0b 0%, #0a0a0f 65%)`, transition: 'background 1.2s ease' }}>

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-10">
        <span className="text-gray-600 text-sm font-mono">{currentIndex + 1} / {sessionTasks.length}</span>
        <div className="flex items-center gap-1">
          {/* PiP */}
          <button onClick={handlePiP} title="Float clock (Picture-in-Picture)"
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/8 transition-all">
            <IPiP />
          </button>
          {/* Fullscreen */}
          <button onClick={handleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/8 transition-all">
            {isFullscreen ? <IExitFS /> : <IFullscreen />}
          </button>
          {/* Hide / Show */}
          <button onClick={() => setClockVisible((v) => !v)} title={isClockVisible ? 'Hide clock' : 'Show clock'}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/8 transition-all">
            {isClockVisible ? <IEye /> : <IEyeOff />}
          </button>
          {/* Close */}
          <button onClick={persistAndExit} title="Save & exit (Esc)"
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/8 transition-all ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Clock + overlay ── */}
      <div className="relative flex items-center justify-center" style={{ width: clockSize, height: clockSize }}>
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full h-full flex items-center justify-center"
          >
            <AnalogClock size={clockSize} taskColor={color} progressPercent={progress}
              taskName={currentTask?.title || ''} isVisible={isClockVisible} />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 pointer-events-none">
          <TaskOverlay taskColor={color} isOnBreak={isOnBreak} />
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="absolute bottom-9 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Prev */}
          <button onClick={() => dispatch(prevTask())} disabled={currentIndex === 0} title="Previous task"
            className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-25 disabled:cursor-not-allowed">
            <IPrev />
          </button>
          {/* Restart current task */}
          <button onClick={handleRestartCurrent} title="Restart current task"
            className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/30 transition-all">
            <IRestart />
          </button>
          {/* Break (center primary button) */}
          <button onClick={openBreak} title="Take a break"
            className="p-4 rounded-full border transition-all shadow-lg"
            style={{ background: `${color}20`, borderColor: `${color}55`, color, boxShadow: `0 0 20px ${color}28` }}>
            <ICoffee />
          </button>
          {/* End current → prompt next */}
          <button onClick={handleEndClick} title="End current task"
            className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30 transition-all">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
          </button>
          {/* Next */}
          <button onClick={() => { beep(660, 0.4); dispatch(nextTask()); }} disabled={currentIndex === sessionTasks.length - 1}
            title="Next task"
            className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-25 disabled:cursor-not-allowed">
            <INext />
          </button>
        </div>

        {/* Pill indicators */}
        <div className="flex gap-2 items-center">
          {sessionTasks.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{ width: i === currentIndex ? 18 : 6, height: 6,
                backgroundColor: i === currentIndex ? color : 'rgba(255,255,255,0.18)' }} />
          ))}
        </div>
      </div>

      <p className="absolute bottom-2 text-gray-800 text-xs">Esc to save & exit</p>

      {/* ── Modals ── */}
      <AnimatePresence>
        {isOnBreak  && <BreakDialog   key="break"    onResume={closeBreak} elapsed={breakElapsed} />}
        {showComplete && !isOnBreak && (
          <CompleteModal key="complete" done={completedTask} next={nextT}
            countdown={autoAdvance} onStartNow={handleStartNow} onBreakFirst={handleBreakFirst} />
        )}
        {showEndDialog && (
          <EndTaskDialog key="end" task={currentTask} nextTask={nextT}
            onNext={handleNextFromEndDialog} onEndAll={handleEndAll}
            onCancel={() => setShowEndDialog(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClockPage;
