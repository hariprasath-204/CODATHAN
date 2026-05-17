import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      {loading && <LoadingOverlay message="Loading Leaderboard..." />}
      <h2 style={{ marginBottom: '2rem' }}>Live Leaderboard</h2>
      
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem' }}>Rank</th>
              <th style={{ padding: '1rem' }}>Lot No</th>
              <th style={{ padding: '1rem' }}>Total Points</th>
              <th style={{ padding: '1rem' }}>Questions Solved</th>
              <th style={{ padding: '1rem' }}>Accuracy %</th>
              <th style={{ padding: '1rem' }}>Flags (Cheat)</th>
              <th style={{ padding: '1rem' }}>Login Count</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
              const accuracy = user.totalSubmissions ? Math.round((user.completedQuestions || 0) / user.totalSubmissions * 100) : 0;
              return (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1rem' }}>{idx + 1}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{user.id}</td>
                <td style={{ padding: '1rem', color: 'var(--accent-success)', fontWeight: 'bold' }}>{user.totalPoints || 0}</td>
                <td style={{ padding: '1rem' }}>{user.completedQuestions || 0}</td>
                <td style={{ padding: '1rem' }}>{accuracy}%</td>
                <td style={{ padding: '1rem', color: user.flags > 0 ? 'var(--accent-danger)' : 'inherit' }}>{user.flags || 0}</td>
                <td style={{ padding: '1rem' }}>{user.loginCount || 0}</td>
              </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
