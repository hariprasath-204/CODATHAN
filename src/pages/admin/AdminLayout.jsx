import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Trophy, Clock, FileText, Users, Activity, FileDown, Code2, AlertOctagon, X, RefreshCw, MonitorPlay, Settings2, Trash2, PenTool, Key } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();

  const navItems = [
    { path: 'leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard' },
    { path: 'rounds', icon: <Clock size={20} />, label: 'Round Setting' },
    { path: 'questions', icon: <FileText size={20} />, label: 'Questions' },
    { path: 'users', icon: <Users size={20} />, label: 'User Management' },
    { path: 'monitoring', icon: <Activity size={20} />, label: 'Breaking News' },
    { path: 'results',     icon: <FileDown size={20} />,    label: 'Results & PDF' },
    { path: 'judgesigns',  icon: <PenTool size={20} />,     label: 'Judge E-Sign' },
    { path: 'submissions', icon: <Code2 size={20} />,       label: 'Submissions' },
    { path: 'livecode',    icon: <MonitorPlay size={20} />, label: 'Live Code' },
    { path: 'languages',   icon: <Settings2 size={20} />,   label: 'Language Settings' },
    { path: 'apikeys',     icon: <Key size={20} />,         label: 'Java API Keys' },
    { path: 'conclusion',  icon: <Trophy size={20} />,      label: 'Conclusion' },
    { path: 'reset',       icon: <Trash2 size={20} color="var(--accent-danger)" />, label: 'Reset Data' },
  ];

  const [latestLogs, setLatestLogs] = useState([]);
  const [showTicker, setShowTicker] = useState(false);
  const [tickerKey, setTickerKey] = useState(0);
  const prevLogCount = React.useRef(0);

  // ── Compiler Emergency Alert ──────────────────────────────────────────────
  const [compilerAlerts, setCompilerAlerts]   = useState([]);
  const [showCompilerAlert, setShowCompilerAlert] = useState(false);
  const prevAlertCount = React.useRef(0);
  const [resetting, setResetting] = React.useState(false);

  const handleCompilerReset = async () => {
    setResetting(true);
    try {
      const { db } = await import('../../firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'system_commands', 'compiler_reset'), {
        resetAt: new Date(),
        triggeredBy: 'admin',
      });
    } catch (e) {
      console.error('Reset failed', e);
    }
    setResetting(false);
    setShowCompilerAlert(false);
  };

  React.useEffect(() => {
    import('../../firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, query, onSnapshot, orderBy, limit }) => {
        // Breaking news ticker
        const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(5));
        onSnapshot(qLogs, (snapshot) => {
          const docs = snapshot.docs;
          const newCount = snapshot.size;
          if (newCount > prevLogCount.current) {
            setShowTicker(true);
            setTickerKey(k => k + 1);
          }
          prevLogCount.current = newCount;
          setLatestLogs(docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Compiler emergency alerts
        const qAlerts = query(collection(db, 'compiler_alerts'), orderBy('timestamp', 'desc'), limit(10));
        onSnapshot(qAlerts, (snapshot) => {
          const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const newCount = snapshot.size;
          if (newCount > prevAlertCount.current) {
            setShowCompilerAlert(true); // new alert arrived
          }
          prevAlertCount.current = newCount;
          setCompilerAlerts(alerts);
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
        {/* 🚨 Compiler Emergency Alert — flashes when all API providers fail */}
        {showCompilerAlert && compilerAlerts.length > 0 && (
          <div style={{
            background: '#ff0000',
            color: '#fff',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            animation: 'emergency-flash 0.8s infinite alternate',
            zIndex: 200,
            position: 'relative',
          }}>
            <AlertOctagon size={24} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '1rem' }}>🚨 EMERGENCY: COMPILER DOWN!</strong>
              <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', opacity: 0.9 }}>
                Last reported by Lot <strong>{compilerAlerts[0]?.lotNo}</strong> at{' '}
                {compilerAlerts[0]?.timestamp?.toDate().toLocaleTimeString()} —
                All {compilerAlerts.length} report(s) in queue.
                Students cannot compile code!
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleCompilerReset}
                disabled={resetting}
                style={{ background: '#000', border: '2px solid #fff', color: '#fff', padding: '0.4rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}
              >
                <RefreshCw size={16} style={{ animation: resetting ? 'spin 1s linear infinite' : 'none' }} />
                {resetting ? 'Resetting...' : 'Reset Compiler'}
              </button>
              <button
                onClick={() => setShowCompilerAlert(false)}
                style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <X size={16} /> Dismiss
              </button>
            </div>
          </div>
        )}

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
            0%   { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          @keyframes emergency-flash {
            0%   { background: #ff0000; }
            100% { background: #cc0000; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
        
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
