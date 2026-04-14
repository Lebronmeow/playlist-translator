import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import UniversalLink from './pages/UniversalLink';

export default function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Animated aurora background */}
        <div className="aurora-bg">
          <div className="aurora-orb" />
        </div>

        {/* Header */}
        <Header />

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/p/:id" element={<UniversalLink />} />
        </Routes>
      </div>
    </Router>
  );
}
