import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';
import { ExternalLink } from 'lucide-react';

export default function Conclusion() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = collection(db, 'users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Complex sorting logic:
      // 1. Flag (disqualified) goes to bottom
      // 2. Points (descending)
      // 3. Timer (Last Submit Time) (ascending)
      // 4. Questions Solved (descending)
      fetchedUsers.sort((a, b) => {
        const aFlag = (a.flags || 0) > 0 ? 1 : 0;
        const bFlag = (b.flags || 0) > 0 ? 1 : 0;
        if (aFlag !== bFlag) return aFlag - bFlag;

        const aPoints = a.totalPoints || 0;
        const bPoints = b.totalPoints || 0;
        if (aPoints !== bPoints) return bPoints - aPoints;

        const aTime = a.lastSubmitTime ? (a.lastSubmitTime.toMillis ? a.lastSubmitTime.toMillis() : a.lastSubmitTime) : Infinity;
        const bTime = b.lastSubmitTime ? (b.lastSubmitTime.toMillis ? b.lastSubmitTime.toMillis() : b.lastSubmitTime) : Infinity;
        if (aTime !== bTime) return aTime - bTime;

        const aQs = a.completedQuestions || 0;
        const bQs = b.completedQuestions || 0;
        return bQs - aQs;
      });

      // Get top 35 only
      setUsers(fetchedUsers.slice(0, 35));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const launchWinners = () => {
    window.open('/admin/final-winners', '_blank');
  };

  return (
    <div>
      {loading && <LoadingOverlay message="Loading Top 35 Winners..." />}
      
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2>Event Conclusion (Top 35)</h2>
        <button className="primary flex-center" onClick={launchWinners}>
          Launch Final 3 Winners <ExternalLink size={16} style={{ marginLeft: '0.5rem' }} />
        </button>
      </div>
      
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem' }}>Rank</th>
              <th style={{ padding: '1rem' }}>Lot No</th>
              <th style={{ padding: '1rem' }}>Total Points</th>
              <th style={{ padding: '1rem' }}>Questions Solved</th>
              <th style={{ padding: '1rem' }}>Last Submit Time</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
              return (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1rem' }}>
                  {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                </td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{user.id}</td>
                <td style={{ padding: '1rem', color: 'var(--accent-success)', fontWeight: 'bold' }}>{user.totalPoints || 0}</td>
                <td style={{ padding: '1rem' }}>{user.completedQuestions || 0}</td>
                <td style={{ padding: '1rem' }}>{user.lastSubmitTime ? new Date(user.lastSubmitTime.toMillis ? user.lastSubmitTime.toMillis() : user.lastSubmitTime).toLocaleTimeString() : 'N/A'}</td>
                <td style={{ padding: '1rem', color: user.flags > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                  {user.flags > 0 ? 'Disqualified' : 'Qualified'}
                </td>
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
