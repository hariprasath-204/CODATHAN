import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import Editor from '@monaco-editor/react';

export default function Monitoring() {
  const [logs, setLogs] = useState([]);
  const [userCodes, setUserCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);

  useEffect(() => {
    // Listen to latest logs (Breaking News)
    const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to live code changes
    const qCode = query(collection(db, 'user_code'), limit(50));
    const unsubCode = onSnapshot(qCode, (snapshot) => {
      setUserCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubLogs();
      unsubCode();
    };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', height: 'calc(100vh - 4rem)' }}>
      {/* Breaking News Feed */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--accent-danger)' }}>Breaking News (Flags)</h2>
        <div className="glass-panel" style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          {logs.map(log => (
            <div key={log.id} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold' }}>Lot No: {log.lotNo}</span>
              <p style={{ margin: '0.5rem 0', color: 'var(--accent-danger)' }}>
                {log.type === 'tab_switch' ? 'Switched tab or minimized window!' : 'Suspicious activity detected!'}
              </p>
              <small style={{ color: 'var(--text-secondary)' }}>
                {log.timestamp?.toDate().toLocaleTimeString()}
              </small>
            </div>
          ))}
          {logs.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No suspicious activity detected yet.</p>}
        </div>
      </div>

      {/* Live Code Monitoring */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '1rem' }}>Live User Code</h2>
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {userCodes.map(uc => (
            <button 
              key={uc.id} 
              className={selectedCode?.id === uc.id ? 'primary' : 'secondary'}
              onClick={() => setSelectedCode(uc)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {uc.lotNo} - Q{uc.questionId.substring(0, 4)}
            </button>
          ))}
          {userCodes.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No live code available.</span>}
        </div>

        <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', padding: '0.5rem' }}>
          {selectedCode ? (
            <Editor
              height="100%"
              theme="vs-dark"
              language={selectedCode.language === 'c++' ? 'cpp' : 'java'}
              value={selectedCode.code}
              options={{ readOnly: true, minimap: { enabled: false } }}
            />
          ) : (
            <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
              Select a user snippet to view live code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
