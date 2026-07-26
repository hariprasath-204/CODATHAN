import React, { useEffect, useState } from 'react';
import { db, dbUG, dbPG } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';
import { getStudentCategory } from '../../utils/ranking';
import { Clock } from 'lucide-react';

const formatDuration = (totalSec) => {
  if (!totalSec || totalSec <= 0) return '0s';
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);
  if (mins === 0) return `${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs === 0) return `${remMins}m ${secs}s`;
  return `${hrs}h ${remMins}m ${secs}s`;
};

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [userCodes, setUserCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL', 'UG', 'PG'

  useEffect(() => {
    const q = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      let fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard data:", error);
      setLoading(false);
    });

    const unsubscribeCodesUG = onSnapshot(collection(dbUG, 'user_code'), (snap) => {
      setUserCodes(prev => {
        const others = prev.filter(c => c.fromDB !== 'UG');
        return [...others, ...snap.docs.map(d => ({ id: d.id, fromDB: 'UG', ...d.data() }))];
      });
    });
    
    const unsubscribeCodesPG = onSnapshot(collection(dbPG, 'user_code'), (snap) => {
      setUserCodes(prev => {
        const others = prev.filter(c => c.fromDB !== 'PG');
        return [...others, ...snap.docs.map(d => ({ id: d.id, fromDB: 'PG', ...d.data() }))];
      });
    });

    return () => {
      unsubscribeUsers();
      unsubscribeCodesUG();
      unsubscribeCodesPG();
    };
  }, []);

  const sortedUsers = [...users].sort((a, b) => {
    const aFlag = (a.flags || 0) > 0 ? 1 : 0;
    const bFlag = (b.flags || 0) > 0 ? 1 : 0;
    if (aFlag !== bFlag) return aFlag - bFlag;

    const aPoints = a.totalPoints || 0;
    const bPoints = b.totalPoints || 0;
    if (aPoints !== bPoints) return bPoints - aPoints;

    // Calculate duration tie-breaker (lower duration ranks higher)
    const aDur = a.totalTimeSeconds || userCodes.filter(uc => uc.lotNo === a.id && uc.passed).reduce((acc, uc) => acc + (uc.durationSeconds || 0), 0);
    const bDur = b.totalTimeSeconds || userCodes.filter(uc => uc.lotNo === b.id && uc.passed).reduce((acc, uc) => acc + (uc.durationSeconds || 0), 0);
    if (aDur > 0 && bDur > 0 && aDur !== bDur) return aDur - bDur;

    const aTime = a.lastSubmitTime ? (a.lastSubmitTime.toMillis ? a.lastSubmitTime.toMillis() : a.lastSubmitTime) : Infinity;
    const bTime = b.lastSubmitTime ? (b.lastSubmitTime.toMillis ? b.lastSubmitTime.toMillis() : b.lastSubmitTime) : Infinity;
    if (aTime !== bTime) return aTime - bTime;

    const aQs = a.completedQuestions || 0;
    const bQs = b.completedQuestions || 0;
    return bQs - aQs;
  });

  const filteredUsers = categoryFilter === 'ALL' ? sortedUsers : sortedUsers.filter(u => (u.category || getStudentCategory(u)) === categoryFilter);

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
              <th style={{ padding: '1rem' }}>Total Time</th>
              <th style={{ padding: '1rem' }}>Last Submit Time</th>
              <th style={{ padding: '1rem' }}>Flags (Cheat)</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, idx) => {
              const uCat = user.category || getStudentCategory(user);
              const totalDur = user.totalTimeSeconds || userCodes.filter(uc => uc.lotNo === user.id && uc.passed).reduce((acc, uc) => acc + (uc.durationSeconds || 0), 0);

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
                  <td style={{ padding: '1rem', color: '#00d2ff', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                    {formatDuration(totalDur)}
                  </td>
                  <td style={{ padding: '1rem' }}>{user.lastSubmitTime ? new Date(user.lastSubmitTime.toMillis ? user.lastSubmitTime.toMillis() : user.lastSubmitTime).toLocaleTimeString() : 'N/A'}</td>
                  <td style={{ padding: '1rem', color: user.flags > 0 ? 'var(--accent-danger)' : 'inherit' }}>{user.flags > 0 ? `Disqualified (${user.flags})` : 0}</td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="9" style={{ padding: '2rem', textAlign: 'center' }}>No users found in {categoryFilter} sector.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
