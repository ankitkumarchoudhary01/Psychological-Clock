import { useSelector } from 'react-redux';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ProtectedRoute  from './components/ProtectedRoute';
import PipWidget       from './components/PipWidget';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import DashboardPage   from './pages/DashboardPage';
import ClockPage       from './pages/ClockPage';
import AnalyticsPage   from './pages/AnalyticsPage';
import { selectIsPiPMode } from './store/clockSlice';

function App() {
  const isPiP = useSelector(selectIsPiPMode);

  return (
    <>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/"          element={<DashboardPage />} />
          <Route path="/clock"     element={<ClockPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global floating PiP widget — persists across page navigation */}
      <AnimatePresence>{isPiP && <PipWidget key="pip" />}</AnimatePresence>
    </>
  );
}

export default App;
