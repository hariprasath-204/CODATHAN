import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

export default function Conclusion() {
  const [users, setUsers] = useState([]);
  const [userCodes, setUserCodes] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      let fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedUsers.sort((a, b) => {
        if ((b.totalPoints || 0) !== (a.totalPoints || 0)) return (b.totalPoints || 0) - (a.totalPoints || 0);
        if ((b.completedQuestions || 0) !== (a.completedQuestions || 0)) return (b.completedQuestions || 0) - (a.completedQuestions || 0);
        return (a.flags || 0) - (b.flags || 0);
      });
      setUsers(fetchedUsers);
      setLoading(false);
    });

    const qCodes = query(collection(db, 'user_code'));
    const unsubCodes = onSnapshot(qCodes, (snapshot) => {
      setUserCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUsers();
      unsubCodes();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Winner Conclusion</h2>
      
      <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel: User List */}
        <div style={{ flex: '1', borderRight: '1px solid var(--glass-border)', paddingRight: '1rem', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>PARTICIPANTS</h3>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {users.map(user => (
                <button 
                  key={user.id} 
                  onClick={() => setSelectedUser(user)}
                  className={selectedUser?.id === user.id ? 'primary' : 'secondary'}
                  style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', padding: '1rem' }}
                >
                  <span style={{ fontWeight: 600 }}>{user.id} - {user.name || 'Unknown'}</span>
                  <span style={{ color: user.flags > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                    {user.totalPoints || 0} pts
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Right Panel: Conclusion Details */}
        <div style={{ flex: '2', paddingLeft: '1rem', overflowY: 'auto' }}>
          {selectedUser ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '2rem' }}>{selectedUser.name || 'Unknown User'}</h2>
                  <span style={{ color: 'var(--text-secondary)' }}>LOT / ROLL NO: {selectedUser.id}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Points</span>
                  <h2 style={{ margin: 0, fontSize: '3rem', color: 'var(--accent-success)' }}>{selectedUser.totalPoints || 0}</h2>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Questions Solved</div>
                  <div style={{ fontSize: '2rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{selectedUser.completedQuestions || 0}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderColor: selectedUser.flags > 0 ? 'var(--accent-danger)' : 'var(--glass-border)' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Cheating Flags</div>
                  <div style={{ fontSize: '2rem', color: selectedUser.flags > 0 ? 'var(--accent-danger)' : 'var(--accent-success)', fontWeight: 600 }}>
                    {selectedUser.flags || 0}
                  </div>
                </div>
              </div>

              <h3 style={{ marginBottom: '1rem' }}>Submission History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {userCodes.filter(uc => uc.lotNo === selectedUser.id).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No submissions recorded.</p>
                ) : (
                  userCodes
                    .filter(uc => uc.lotNo === selectedUser.id)
                    .map((uc, i) => (
                      <div key={i} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Question ID: {uc.questionId}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Language: {uc.language?.toUpperCase()}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {uc.passed ? (
                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>PASSED</span>
                          ) : (
                            <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>FAILED</span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Select a participant from the left to view their detailed conclusion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
