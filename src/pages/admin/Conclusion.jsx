import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';
import { ExternalLink } from 'lucide-react';
import { getStudentCategory } from '../../utils/ranking';

export default function Conclusion() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL', 'UG', 'PG'

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

      setUsers(fetchedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const launchWinners = () => {
    window.open(`/admin/final-winners?cat=${categoryFilter}`, '_blank');
  };

  const filteredUsers = (categoryFilter === 'ALL' ? users : users.filter(u => (u.category || getStudentCategory(u)) === categoryFilter)).slice(0, 35);

  return (
    <div>
      {loading && <LoadingOverlay message="Loading Top 35 Winners..." />}
      
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Event Conclusion ({categoryFilter === 'ALL' ? 'Combined Top 35' : `${categoryFilter} Sector Top 35`})</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            {['ALL', 'UG', 'PG'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: categoryFilter === cat ? 'var(--accent-primary)' : 'transparent',
                  color: categoryFilter === cat ? '#000' : 'var(--text-secondary)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {cat === 'ALL' ? 'All Combined' : `${cat} Sector`}
              </button>
            ))}
          </div>

          <button className="primary flex-center" onClick={launchWinners}>
            Launch {categoryFilter === 'ALL' ? 'Combined' : categoryFilter} Champions Podium <ExternalLink size={16} style={{ marginLeft: '0.5rem' }} />
          </button>
        </div>
      </div>
      
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem' }}>Rank</th>
              <th style={{ padding: '1rem' }}>Lot / Roll No</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Category</th>
              <th style={{ padding: '1rem' }}>Total Points</th>
              <th style={{ padding: '1rem' }}>Questions Solved</th>
              <th style={{ padding: '1rem' }}>Last Submit Time</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, idx) => {
              const uCat = user.category || getStudentCategory(user);
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{user.id}</td>
                  <td style={{ padding: '1rem' }}>{user.name || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      background: uCat === 'PG' ? 'rgba(255, 0, 255, 0.15)' : 'rgba(0, 245, 155, 0.15)',
                      color: uCat === 'PG' ? '#ff00ff' : '#00f59b',
                      border: `1px solid ${uCat === 'PG' ? '#ff00ff' : '#00f59b'}`
                    }}>
                      {uCat}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--accent-success)', fontWeight: 'bold' }}>{user.totalPoints || 0}</td>
                  <td style={{ padding: '1rem' }}>{user.completedQuestions || 0}</td>
                  <td style={{ padding: '1rem' }}>{user.lastSubmitTime ? new Date(user.lastSubmitTime.toMillis ? user.lastSubmitTime.toMillis() : user.lastSubmitTime).toLocaleTimeString() : 'N/A'}</td>
                  <td style={{ padding: '1rem', color: user.flags > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                    {user.flags > 0 ? 'Disqualified' : 'Qualified'}
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '2rem', textAlign: 'center' }}>No users found in {categoryFilter} sector.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
