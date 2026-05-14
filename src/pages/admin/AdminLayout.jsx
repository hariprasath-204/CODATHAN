import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Trophy, Clock, FileText, Users, Activity, FileDown, Code2 } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();

  const navItems = [
    { path: 'leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard' },
    { path: 'rounds', icon: <Clock size={20} />, label: 'Round Setting' },
    { path: 'questions', icon: <FileText size={20} />, label: 'Questions' },
    { path: 'users', icon: <Users size={20} />, label: 'User Management' },
    { path: 'monitoring', icon: <Activity size={20} />, label: 'Breaking News' },
    { path: 'results', icon: <FileDown size={20} />, label: 'Results & PDF' },
    { path: 'submissions', icon: <Code2 size={20} />, label: 'Submissions' },
  ];

  const [latestLogs, setLatestLogs] = useState([]);
  const [showTicker, setShowTicker] = useState(false);
  const [tickerKey, setTickerKey] = useState(0);  // force re-mount on new log
  const prevLogCount = React.useRef(0);

  React.useEffect(() => {
    import('../../firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, query, onSnapshot, orderBy, limit }) => {
        const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(5));
        onSnapshot(qLogs, (snapshot) => {
          const docs = snapshot.docs;
          const newCount = snapshot.size;
          if (newCount > prevLogCount.current) {
            // New log arrived — re-mount ticker animation
            setShowTicker(true);
            setTickerKey(k => k + 1);
          }
          prevLogCount.current = newCount;
          setLatestLogs(docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      });
    });
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div className="glass-panel" style={{ width: '250px', borderRadius: 0, padding: '2rem 1rem', borderTop: 'none', borderBottom: 'none', borderLeft: 'none', zIndex: 10 }}>
        <h2 className="text-gradient" style={{ marginBottom: '2rem', textAlign: 'center' }}>Admin Panel</h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `flex-center ${isActive ? 'primary' : 'secondary'}`}
              style={{ padding: '1rem', borderRadius: '8px', justifyContent: 'flex-start', textDecoration: 'none', color: 'inherit' }}
            >
              <span style={{ marginRight: '1rem' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Breaking News Ticker */}
        {showTicker && latestLogs.length > 0 && (
          <div style={{ background: 'var(--accent-danger)', color: 'white', padding: '0.5rem', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
            <span style={{ background: 'black', padding: '0.2rem 0.5rem', borderRadius: '4px', marginRight: '1rem', whiteSpace: 'nowrap' }}>
              BREAKING NEWS
            </span>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div 
                key={tickerKey}
                onAnimationEnd={() => setShowTicker(false)}
                style={{ display: 'inline-block', whiteSpace: 'nowrap', animation: 'scroll-left 15s linear 1' }}
              >
                {latestLogs.map((log, i) => (
                  <span key={i} style={{ marginRight: '3rem' }}>
                    🚨 Lot {log.lotNo} {log.type === 'tab_switch' ? 'attempted to switch tabs or minimize!' : 'triggered a flag!'} ({log.timestamp?.toDate().toLocaleTimeString()})
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        <style>{`
          @keyframes scroll-left {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
        
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
