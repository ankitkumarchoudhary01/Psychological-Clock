import { useSelector } from 'react-redux';
import {
  selectCurrentTask,
  selectNextTask,
  selectCurrentTaskIndex,
  selectSessionTasks,
} from '../store/clockSlice';

const TaskOverlay = ({ secondsLeft }) => {
  const currentTask = useSelector(selectCurrentTask);
  const nextTask = useSelector(selectNextTask);
  const currentIndex = useSelector(selectCurrentTaskIndex);
  const sessionTasks = useSelector(selectSessionTasks);

  if (!currentTask) return null;

  const totalSeconds = currentTask.durationMinutes * 60;
  const progressPercent = Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100);

  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <>
      {/* Task name — top center */}
      <div className="absolute top-6 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentTask.color || '#6366f1' }}
          />
          <span className="text-white/80 text-sm font-medium tracking-wide uppercase">
            Task {currentIndex + 1} of {sessionTasks.length}
          </span>
        </div>
        <h2
          className="text-white text-2xl sm:text-3xl font-bold text-center px-4 leading-tight"
          style={{ textShadow: `0 0 30px ${currentTask.color}50` }}
        >
          {currentTask.title}
        </h2>
      </div>

      {/* Countdown — bottom center */}
      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none">
        {nextTask && (
          <p className="text-gray-500 text-sm">
            Next: <span className="text-gray-400">{nextTask.title}</span>
          </p>
        )}
        <div
          className="font-mono text-5xl sm:text-6xl font-bold tabular-nums"
          style={{ color: secondsLeft < 60 ? '#ef4444' : currentTask.color || '#6366f1',
            textShadow: `0 0 20px ${secondsLeft < 60 ? '#ef444450' : `${currentTask.color}50`}` }}
        >
          {hh}:{mm}:{ss}
        </div>
        <p className="text-gray-500 text-xs">remaining</p>

        {/* Progress bar */}
        <div className="w-64 sm:w-80 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: currentTask.color || '#6366f1',
            }}
          />
        </div>
      </div>
    </>
  );
};

export default TaskOverlay;
