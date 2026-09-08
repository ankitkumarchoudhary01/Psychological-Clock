import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { logout, selectCurrentUser } from '../store/authSlice';
import { selectTasks, setTasks } from '../store/tasksSlice';
import { startSession } from '../store/clockSlice';
import { authApi } from '../services/api';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const tasks = useSelector(selectTasks);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (_) {
      // ignore
    }
    dispatch(logout());
    dispatch(setTasks([]));
    navigate('/login');
    toast.success('Signed out successfully.');
  };

  const handleStartSession = () => {
    if (tasks.length === 0) return toast.error('Add at least one task first!');
    dispatch(startSession(tasks));
    navigate('/clock');
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="text-2xl">🕐</span>
          <span className="font-bold text-white text-lg hidden sm:block">Psychology Clock</span>
        </div>

        {/* Greeting */}
        {user && (
          <div className="hidden md:block text-gray-400 text-sm">
            Hello,{' '}
            <span className="text-white font-medium">{user.name.split(' ')[0]}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartSession}
            disabled={tasks.length === 0}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Start Session</span>
            <span className="sm:hidden">Start</span>
          </button>

          <button onClick={handleLogout} className="btn-ghost text-sm">
            <svg className="w-4 h-4 sm:mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
