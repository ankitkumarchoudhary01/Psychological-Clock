import { useSelector } from 'react-redux';
import {
  selectNextTask,
  selectCurrentTaskIndex,
  selectSessionTasks,
} from '../store/clockSlice';

/**
 * Minimal overlay on top of the clock.
 * Task name is now rendered inside the clock SVG center.
 * This overlay only shows the task counter chip + next-task hint.
 */
const TaskOverlay = ({ taskColor = '#6366f1', isOnBreak = false }) => {
  const nextTask = useSelector(selectNextTask);
  const currentIndex = useSelector(selectCurrentTaskIndex);
  const sessionTasks = useSelector(selectSessionTasks);

  return (
    <>
      {/* Task counter — top center */}
      <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            backgroundColor: `${taskColor}18`,
            border: `1px solid ${taskColor}30`,
            color: taskColor,
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: taskColor }} />
          Task {currentIndex + 1} of {sessionTasks.length}
          {isOnBreak && (
            <span className="ml-1 text-amber-400 animate-pulse">· On Break</span>
          )}
        </div>
      </div>

      {/* Next task hint — below clock (absolute bottom of overlay container) */}
      {nextTask && !isOnBreak && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <p className="text-gray-600 text-sm">
            Up next:{' '}
            <span className="text-gray-400 font-medium">{nextTask.title}</span>
          </p>
        </div>
      )}
    </>
  );
};

export default TaskOverlay;
