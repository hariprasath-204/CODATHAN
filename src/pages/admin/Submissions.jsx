import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { Code2, ChevronDown, ChevronUp, CheckCircle, User } from 'lucide-react';

export default function Submissions() {
  const [users, setUsers]           = useState([]);
  const [rounds, setRounds]         = useState([]);
  const [questions, setQuestions]   = useState([]);
  const [userCodes, setUserCodes]   = useState([]);
  const [selectedRound, setSelectedRound] = useState('all');
  const [expandedKey, setExpandedKey]     = useState(null); // "lotNo_questionId"
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch users, rounds, questions once
      const [uSnap, rSnap, qSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'rounds')),
        getDocs(collection(db, 'questions')),
      ]);

      let r = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      r.sort((a, b) => (a.createdAt?.toDate().getTime() || 0) - (b.createdAt?.toDate().getTime() || 0));

      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRounds(r);
      setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();

    // Live-listen to all user_code submissions
    const unsub = onSnapshot(collection(db, 'user_code'), (snap) => {
      setUserCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Questions to show based on round filter
  const filteredQuestions = selectedRound === 'all'
    ? questions
    : questions.filter(q => q.roundId === selectedRound);

  const toggleExpand = (key) => setExpandedKey(prev => prev === key ? null : key);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Fetching submissions...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ margin: 0 }}>User Submissions</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filter by Round:</label>
          <select
            value={selectedRound}
            onChange={e => setSelectedRound(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="all">All Rounds</option>
            {rounds.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Per-user table */}
      {users.length === 0 && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No registered users found.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {users.map(user => {
          // Questions finished by this user within the current filter
          const userFinished = filteredQuestions.filter(q =>
            userCodes.some(uc => uc.lotNo === user.id && uc.questionId === q.id && uc.passed === true)
          );
          const totalFiltered = filteredQuestions.length;

          return (
            <div key={user.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              {/* User header row */}
              <div className="flex-between" style={{ marginBottom: userFinished.length > 0 ? '1.5rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <User size={24} style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      {user.name || user.id}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Lot No: <strong style={{ color: 'var(--accent-primary)' }}>{user.id}</strong>
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--glass-border)',
                    padding: '0.4rem 1rem',
                    fontSize: '0.9rem',
                    color: userFinished.length === totalFiltered && totalFiltered > 0
                      ? 'var(--accent-success)' : 'var(--text-secondary)'
                  }}>
                    {userFinished.length} / {totalFiltered} Completed
                  </span>
                </div>
              </div>

              {/* Finished questions list */}
              {userFinished.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  No completed questions in this round yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {userFinished.map(q => {
                    const submission = userCodes.find(
                      uc => uc.lotNo === user.id && uc.questionId === q.id
                    );
                    const round = rounds.find(r => r.id === q.roundId);
                    const key = `${user.id}_${q.id}`;
                    const isOpen = expandedKey === key;

                    return (
                      <div key={q.id} style={{ border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)' }}>
                        {/* Question row header (clickable) */}
                        <button
                          onClick={() => toggleExpand(key)}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: isOpen ? '1px solid var(--glass-border)' : 'none',
                            padding: '1rem 1.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            textTransform: 'none',
                            letterSpacing: 0,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <CheckCircle size={18} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600 }}>{q.title}</span>
                            <span style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-tertiary)',
                              padding: '0.2rem 0.6rem',
                            }}>
                              {round?.name || 'Unknown Round'}
                            </span>
                            <span style={{
                              fontSize: '0.8rem',
                              color: 'var(--accent-warning)',
                              background: 'var(--bg-tertiary)',
                              padding: '0.2rem 0.6rem',
                            }}>
                              {submission?.language?.toUpperCase() || 'N/A'}
                            </span>
                          </div>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        {/* Expandable code block */}
                        {isOpen && (
                          <div style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                              <Code2 size={16} style={{ color: 'var(--accent-primary)' }} />
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Submitted Code
                              </span>
                            </div>
                            <pre style={{
                              background: '#000',
                              border: '1px solid var(--glass-border)',
                              padding: '1.2rem',
                              color: 'var(--accent-primary)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.9rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: '400px',
                              overflowY: 'auto',
                              margin: 0,
                            }}>
                              {submission?.code || '// No code found'}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
