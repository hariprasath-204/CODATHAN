import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';
import { getStudentCategory } from '../../utils/ranking';

export default function Leaderboard() {
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
    }, (error) => {
      console.error("Error fetching leaderboard data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = categoryFilter === 'ALL' ? users : users.filter(u => (u.category || getStudentCategory(u)) === categoryFilter);

  return (
    <div>
      {loading && <LoadingOverlay message="Loading Leaderboard..." />}
      
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Live Leaderboard ({categoryFilter === 'ALL' ? 'Combined' : `${categoryFilter} Sector`})</h2>
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
              <th style={{ padding: '1rem' }}>Flags (Cheat)</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, idx) => {
              const uCat = user.category || getStudentCategory(user);
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{idx + 1}</td>
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
                  <td style={{ padding: '1rem', color: user.flags > 0 ? 'var(--accent-danger)' : 'inherit' }}>{user.flags > 0 ? `Disqualified (${user.flags})` : 0}</td>
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
