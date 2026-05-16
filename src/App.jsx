import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import UniversalLink from './pages/UniversalLink';
import MusicShowcase from './pages/MusicShowcase';

const pageTransition = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: 'easeIn' } },
};

function AnimatedRoutes() {
  const location = useLocation();
  const isShowcase = location.pathname === '/showcase';

  // Showcase page has its own full-bleed layout — skip normal wrapper
  if (isShowcase) {
    return (
      <Routes location={location}>
        <Route path="/showcase" element={<MusicShowcase />} />
      </Routes>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div {...pageTransition}>
              <Home />
            </motion.div>
          }
        />
        <Route
          path="/dashboard"
          element={
            <motion.div {...pageTransition}>
              <Dashboard />
            </motion.div>
          }
        />
        <Route
          path="/p/:id"
          element={
            <motion.div {...pageTransition}>
              <UniversalLink />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

function AppShell() {
  const location = useLocation();
  const isShowcase = location.pathname === '/showcase';

  if (isShowcase) {
    return <AnimatedRoutes />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <Header />

      {/* Routes with page transitions */}
      <AnimatedRoutes />
    </div>
  );
}
