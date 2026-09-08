import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { tasksApi } from '../services/api';
import { addTask, updateTask, selectTotalMinutes } from '../store/tasksSlice';

const COLOR_PALETTE = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#f97316', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16',
];

const AddTaskModal = ({ isOpen, onClose, editTask = null }) => {
  const dispatch = useDispatch();
  const totalMinutes = useSelector(selectTotalMinutes);

  const [title, setTitle] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [loading, setLoading] = useState(false);

  // Compute available minutes for validation
  const usedMinutes = editTask
    ? totalMinutes - editTask.durationMinutes
    : totalMinutes;
  const availableMinutes = 1440 - usedMinutes;

  // Pre-fill when editing
  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setHours(Math.floor(editTask.durationMinutes / 60));
      setMinutes(editTask.durationMinutes % 60);
      setColor(editTask.color || COLOR_PALETTE[0]);
    } else {
      setTitle('');
      setHours(0);
      setMinutes(30);
      setColor(COLOR_PALETTE[0]);
    }
  }, [editTask, isOpen]);

  const totalInputMinutes = hours * 60 + minutes;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Please enter a task title.');
    if (totalInputMinutes < 1) return toast.error('Duration must be at least 1 minute.');
    if (totalInputMinutes > availableMinutes) {
      return toast.error(`Only ${Math.floor(availableMinutes / 60)}h ${availableMinutes % 60}m available.`);
    }

    setLoading(true);
    try {
      if (editTask) {
        const res = await tasksApi.updateTask(editTask._id, {
          title: title.trim(),
          durationMinutes: totalInputMinutes,
          color,
        });
        dispatch(updateTask(res.data.data.task));
        toast.success('Task updated!');
      } else {
        const res = await tasksApi.createTask({
          title: title.trim(),
          durationMinutes: totalInputMinutes,
          color,
        });
        dispatch(addTask(res.data.data.task));
        toast.success('Task added!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const formatAvailable = () => {
    const h = Math.floor(availableMinutes / 60);
    const m = availableMinutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative glass-card p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Task Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Deep Work, Exercise, Reading..."
                  className="input-field"
                  maxLength={100}
                  autoFocus
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Duration{' '}
                  <span className="text-gray-500 font-normal">
                    ({formatAvailable()} available)
                  </span>
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="flex items-center input-field gap-2 px-3">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={hours}
                        onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                        className="w-full bg-transparent text-center text-white focus:outline-none font-mono text-lg"
                      />
                      <span className="text-gray-400 text-sm flex-shrink-0">hr</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center input-field gap-2 px-3">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={minutes}
                        onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="w-full bg-transparent text-center text-white focus:outline-none font-mono text-lg"
                      />
                      <span className="text-gray-400 text-sm flex-shrink-0">min</span>
                    </div>
                  </div>
                </div>
                {totalInputMinutes > 0 && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    = {totalInputMinutes} minutes total
                    {totalInputMinutes > availableMinutes && (
                      <span className="text-red-400 ml-1">⚠ Exceeds available time</span>
                    )}
                  </p>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full transition-all duration-150 flex-shrink-0"
                      style={{
                        backgroundColor: c,
                        transform: color === c ? 'scale(1.3)' : 'scale(1)',
                        boxShadow: color === c ? `0 0 0 3px rgba(255,255,255,0.3)` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || totalInputMinutes < 1}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Saving...
                    </>
                  ) : editTask ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddTaskModal;
