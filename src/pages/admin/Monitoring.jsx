import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';

export default function Monitoring() {
  const [logs, setLogs]       = useState([]);
  const [clearing, setClearing] = useState(false);

  const clearAllLogs = async () => {
    if (!window.confirm('Clear all breaking news logs? This cannot be undone.')) return;
    setClearing(true);
    const snap = await getDocs(collection(db, 'logs'));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'logs', d.id))));
    setClearing(false);
  };

  useEffect(() => {
    const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub  = onSnapshot(qLogs, snap =>
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
        <h2 style={{ color: 'var(--accent-danger)', margin: 0 }}>
          Breaking News — Anti-Cheat Flags
          <span style={{ marginLeft: '1rem', fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
            ({logs.length} violation{logs.length !== 1 ? 's' : ''} detected)
          </span>
        </h2>
        <button
          className="danger"
          onClick={clearAllLogs}
          disabled={clearing || logs.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Trash2 size={16} />
          {clearing ? 'Clearing...' : 'Clear All'}
        </button>
      </div>

      {/* Flags Feed */}
      <div className="glass-panel" style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            ✅ No suspicious activity detected yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {logs.map(log => (
              <div key={log.id} style={{
                padding: '1.2rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '1.1rem' }}>
                    Lot {log.lotNo}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {log.timestamp?.toDate().toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--accent-danger)', fontSize: '0.9rem' }}>
                  🚨 {log.type === 'tab_switch' ? 'Switched tab or minimized window!' : 'Suspicious activity detected!'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
