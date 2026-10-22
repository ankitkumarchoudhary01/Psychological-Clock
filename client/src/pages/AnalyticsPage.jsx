import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { selectSessions, clearHistory } from '../store/historySlice';
import Navbar from '../components/Navbar';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmtH  = (s) => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
const fmtHr = (s) => (s / 3600).toFixed(1) + 'h';
const dayLabel = (offset) => {
  const d = new Date(); d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};
const dayName = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en', { weekday: 'short' });
};

/* ─── Bar chart (last 7 days) ──────────────────────────────────────────────── */
const BarChart = ({ sessions }) => {
  const days = Array.from({ length: 7 }, (_, i) => dayLabel(6 - i)); // oldest → newest
  const data = days.map((d) => {
    const daySessions = sessions.filter((s) => s.date === d);
    const minutes = daySessions.reduce((sum, s) => sum + Math.round((s.totalFocusSeconds || 0) / 60), 0);
    return { date: d, day: dayName(d), minutes };
  });

  const maxMin = Math.max(...data.map((d) => d.minutes), 60); // at least 60 for scale
  const today  = new Date().toISOString().slice(0, 10);

  const W = 560, H = 140, pad = 24, barW = 48, gap = (W - pad * 2 - barW * 7) / 6;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full max-w-xl mx-auto">
        {/* Horizontal guide lines */}
        {[0, 0.5, 1].map((frac, i) => (
          <line key={i}
            x1={pad} y1={H - H * frac} x2={W - pad} y2={H - H * frac}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}

        {data.map(({ date, day, minutes }, i) => {
          const barH  = Math.max(2, Math.round((minutes / maxMin) * H));
          const x     = pad + i * (barW + gap);
          const y     = H - barH;
          const isToday = date === today;
          const hasData = minutes > 0;

          return (
            <g key={date}>
              {/* Bar */}
              <rect x={x} y={y} width={barW} height={barH} rx="6"
                fill={isToday
                  ? 'url(#todayGrad)'
                  : hasData
                    ? 'url(#barGrad)'
                    : 'rgba(255,255,255,0.05)'}
              />
              {/* Minutes label above bar */}
              {hasData && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                  fill="rgba(255,255,255,0.55)" fontSize="9" fontFamily="JetBrains Mono,monospace">
                  {minutes < 60 ? `${minutes}m` : `${Math.floor(minutes/60)}h`}
                </text>
              )}
              {/* Day label */}
              <text x={x + barW / 2} y={H + 16} textAnchor="middle"
                fill={isToday ? '#818cf8' : 'rgba(255,255,255,0.35)'}
                fontSize="10" fontFamily="Inter,sans-serif" fontWeight={isToday ? '600' : '400'}>
                {isToday ? 'Today' : day}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="todayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

/* ─── KPI card ─────────────────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, sub, color = '#6366f1' }) => (
  <motion.div whileHover={{ scale: 1.03 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
    className="glass-card p-5 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div className="text-2xl">{icon}</div>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <p className="text-3xl font-bold text-white" style={{ color }}>{value}</p>
    {sub && <p className="text-gray-500 text-xs">{sub}</p>}
  </motion.div>
);

/* ─── Session row ──────────────────────────────────────────────────────────── */
const SessionRow = ({ session }) => {
  const started = new Date(session.startedAt);
  const timeStr = started.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-semibold text-sm">
            {started.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' '}· {timeStr}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {session.completedTaskCount}/{session.tasks.length} tasks ·{' '}
            {fmtH(session.totalFocusSeconds)} focused
            {session.breaks.length > 0 && ` · ${session.breaks.length} break${session.breaks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          session.wasCompleted
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          {session.wasCompleted ? 'Completed' : 'Partial'}
        </div>
      </div>

      {/* Task color chips */}
      <div className="flex flex-wrap gap-1.5">
        {session.tasks.slice(0, 6).map((t, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-lg font-medium"
            style={{ background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}30` }}>
            {t.title}
          </span>
        ))}
        {session.tasks.length > 6 && (
          <span className="text-xs px-2 py-0.5 rounded-lg text-gray-500 border border-white/10">
            +{session.tasks.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   ANALYTICS PAGE
══════════════════════════════════════════════════════════════════════════════ */
const AnalyticsPage = () => {
  const sessions = useSelector(selectSessions);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  /* ── Derived metrics ── */
  const today   = new Date().toISOString().slice(0, 10);
  const weekAgo = Date.now() - 7 * 86400000;

  const todaySess    = sessions.filter((s) => s.date === today);
  const weekSess     = sessions.filter((s) => new Date(s.startedAt).getTime() >= weekAgo);
  const allBreaks    = sessions.flatMap((s) => s.breaks || []);

  const totalFocusToday    = todaySess.reduce((s, x) => s + (x.totalFocusSeconds || 0), 0);
  const totalFocusWeek     = weekSess.reduce((s, x)  => s + (x.totalFocusSeconds || 0), 0);
  const totalBreakSec      = sessions.reduce((s, x)  => s + (x.totalBreakSeconds || 0), 0);
  const avgTasksPerSession = sessions.length
    ? (sessions.reduce((s, x) => s + (x.completedTaskCount || 0), 0) / sessions.length).toFixed(1)
    : 0;

  // Most common break reason
  const reasonCount = {};
  allBreaks.forEach((b) => { reasonCount[b.reason] = (reasonCount[b.reason] || 0) + 1; });
  const topReason = Object.entries(reasonCount).sort((a, b) => b[1] - a[1])[0];

  // Completion rate
  const completedSess = sessions.filter((s) => s.wasCompleted).length;
  const completionRate = sessions.length ? Math.round((completedSess / sessions.length) * 100) : 0;

  // Best day (most focus minutes)
  const byDay = {};
  sessions.forEach((s) => { byDay[s.date] = (byDay[s.date] || 0) + (s.totalFocusSeconds || 0); });
  const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

  /* ── Streak calculation ── */
  const uniqueDays = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  let streak = 0;
  const cur = new Date();
  for (const d of uniqueDays) {
    const expected = new Date(cur).toISOString().slice(0, 10);
    if (d === expected) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="text-gray-500 mt-1 text-sm">Your focus history & performance</p>
          </div>
          {sessions.length > 0 && (
            <button onClick={() => { if (window.confirm('Clear all analytics history?')) dispatch(clearHistory()); }}
              className="btn-ghost text-red-400 hover:text-red-300 border-red-500/20 text-sm">
              Clear History
            </button>
          )}
        </motion.div>

        {sessions.length === 0 ? (
          /* ── Empty state ── */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">📊</div>
            <h2 className="text-xl font-semibold text-white">No data yet</h2>
            <p className="text-gray-500 text-sm max-w-sm">
              Complete your first focus session and analytics will appear here.
            </p>
            <button onClick={() => navigate('/')} className="btn-primary mt-2">
              Start a Session
            </button>
          </motion.div>
        ) : (
          <>
            {/* ── KPI grid ── */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <KpiCard icon="🔥" label="Streak"          value={`${streak}d`}         sub="consecutive days"  color="#f59e0b" />
              <KpiCard icon="⏱️" label="Focus Today"     value={fmtHr(totalFocusToday)} sub={`${todaySess.length} session${todaySess.length !== 1 ? 's' : ''}`} color="#6366f1" />
              <KpiCard icon="📅" label="Focus This Week" value={fmtHr(totalFocusWeek)} sub={`${weekSess.length} sessions`} color="#8b5cf6" />
              <KpiCard icon="✅" label="Completion Rate" value={`${completionRate}%`}  sub={`${completedSess}/${sessions.length} sessions`} color="#10b981" />
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.10 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <KpiCard icon="☕" label="Total Breaks"    value={allBreaks.length}      sub={fmtH(totalBreakSec) + ' break time'} color="#f97316" />
              <KpiCard icon="📌" label="Avg Tasks/Sess"  value={avgTasksPerSession}    sub="tasks per session"  color="#ec4899" />
              <KpiCard icon="🏆" label="Best Day"
                value={bestDay ? dayName(bestDay[0]) : '–'}
                sub={bestDay ? fmtH(bestDay[1]) : 'No data yet'} color="#f59e0b" />
              <KpiCard icon="💤" label="Top Break"
                value={topReason ? topReason[0].split(' ')[0] : '–'}
                sub={topReason ? `${topReason[1]}× ${topReason[0]}` : 'No breaks'} color="#14b8a6" />
            </motion.section>

            {/* ── Last 7 Days chart ── */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }} className="glass-card p-5 mb-8">
              <h2 className="text-white font-semibold mb-4">Focus Time — Last 7 Days</h2>
              <BarChart sessions={sessions} />
            </motion.section>

            {/* ── Recent sessions ── */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}>
              <h2 className="text-white font-semibold mb-3">Recent Sessions</h2>
              <div className="flex flex-col gap-3">
                {[...sessions].reverse().slice(0, 10).map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
