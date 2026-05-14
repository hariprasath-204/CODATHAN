import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// User Pages
import LandingPage from './pages/user/LandingPage';
import LoginPage from './pages/user/LoginPage';
import WaitingPage from './pages/user/WaitingPage';
import EventDashboard from './pages/user/EventDashboard';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import Leaderboard from './pages/admin/Leaderboard';
import RoundSetting from './pages/admin/RoundSetting';
import Questions from './pages/admin/Questions';
import Users from './pages/admin/Users';
import Monitoring from './pages/admin/Monitoring';
import Results from './pages/admin/Results';
import Submissions from './pages/admin/Submissions';
import LiveCode from './pages/admin/LiveCode';
import Languages from './pages/admin/Languages';

function App() {
  return (
    <Router>
      <div className="animated-bg"></div>
      <Routes>
        {/* User Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/waiting" element={<WaitingPage />} />
        <Route path="/event" element={<EventDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="leaderboard" replace />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="rounds" element={<RoundSetting />} />
          <Route path="questions" element={<Questions />} />
          <Route path="users" element={<Users />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="results" element={<Results />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="livecode" element={<LiveCode />} />
          <Route path="languages" element={<Languages />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
