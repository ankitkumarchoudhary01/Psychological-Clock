import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import TaskList from '../components/TaskList';
import DayRing from '../components/DayRing';
import { tasksApi } from '../services/api';
import { setTasks, selectTasks, selectTotalMinutes } from '../store/tasksSlice';
import { selectCurrentUser } from '../store/authSlice';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const tasks = useSelector(selectTasks);
  const totalMinutes = useSelector(selectTotalMinutes);
  const freeMinutes = 1440 - totalMinutes;

  // Load tasks on mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await tasksApi.getTasks();
        dispatch(setTasks(res.data.data.tasks));
      } catch {
        toast.error('Failed to load tasks.');
      }
    };
    fetchTasks();
  }, [dispatch]);

  const stats = [
    { label: 'Tasks', value: tasks.length, icon: '📋' },
    { label: 'Scheduled', value: formatTime(totalMinutes), icon: '⏱' },
    { label: 'Free Time', value: formatTime(freeMinutes), icon: '🌿' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {getGreeting()},{' '}
            <span className="text-gradient">{user?.name?.split(' ')[0] || 'there'}</span> 👋
          </h1>
          <p className="text-gray-400 mt-1.5">
            {tasks.length === 0
              ? "Add tasks below to start planning your day."
              : `Here's how your day is distributed.`}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Task List — takes more space */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-3"
          >
            <TaskList />
          </motion.div>

          {/* Day Ring */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-4">Your 24 Hours</h2>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🕰</div>
                  <p className="text-gray-500 text-sm">Add tasks to see your day distribution</p>
                </div>
              ) : (
                <DayRing />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
