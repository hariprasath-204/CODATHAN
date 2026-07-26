import React, { useState, useEffect } from 'react';
import { db, dbUG, dbPG } from '../../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { Code2, ChevronDown, ChevronUp, CheckCircle, User, Clock } from 'lucide-react';
import { getStudentCategory } from '../../utils/ranking';

const formatTime = (ts) => {
  if (!ts) return 'N/A';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const analyzeCode = (code) => {
  if (!code) return { lines: 0, loops: 0, conditions: 0, prints: 0 };
  const lines = code.split('\n').length;
  const loops = (code.match(/\b(for|while)\b\s*\(/g) || []).length;
  const conditions = (code.match(/\b(if|else if)\b\s*\(/g) || []).length + (code.match(/\belse\b\s*\{?/g) || []).length;
  const prints = (code.match(/\b(printf|cout|System\.out\.print|print|println)\b/g) || []).length;
  return { lines, loops, conditions, prints };
};

const formatDuration = (totalSec) => {
  if (!totalSec || totalSec <= 0) return 'N/A';
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);
  if (mins === 0) return `${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs === 0) return `${remMins}m ${secs}s`;
  return `${hrs}h ${remMins}m ${secs}s`;
};

export default function Submissions() {
  const [users, setUsers]           = useState([]);
  const [rounds, setRounds]         = useState([]);
  const [questions, setQuestions]   = useState([]);
  const [userCodes, setUserCodes]   = useState([]);
  const [selectedRound, setSelectedRound] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL', 'UG', 'PG'
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

    // Live-listen to all user_code submissions from UG and PG databases
    const unsubUG = onSnapshot(collection(dbUG, 'user_code'), (snap) => {
      setUserCodes(prev => {
        const others = prev.filter(c => c.fromDB !== 'UG');
        return [...others, ...snap.docs.map(d => ({ id: d.id, fromDB: 'UG', ...d.data() }))];
      });
    });
    const unsubPG = onSnapshot(collection(dbPG, 'user_code'), (snap) => {
      setUserCodes(prev => {
        const others = prev.filter(c => c.fromDB !== 'PG');
        return [...others, ...snap.docs.map(d => ({ id: d.id, fromDB: 'PG', ...d.data() }))];
      });
    });
    return () => { unsubUG(); unsubPG(); };
  }, []);

  // Questions to show based on round filter
  const filteredQuestions = selectedRound === 'all'
    ? questions
    : questions.filter(q => q.roundId === selectedRound);

  const filteredUsers = categoryFilter === 'ALL'
    ? users
    : users.filter(u => (u.category || getStudentCategory(u)) === categoryFilter);

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
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="text-gradient" style={{ margin: 0 }}>
          User Submissions {categoryFilter !== 'ALL' ? `(${categoryFilter} Sector)` : ''}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* UG / PG Sector Buttons */}
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

          {/* Round Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filter by Round:</label>
            <select
              value={selectedRound}
              onChange={e => setSelectedRound(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="all">All Rounds</option>
              {rounds.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Per-user table */}
      {filteredUsers.length === 0 && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No registered users found in {categoryFilter === 'ALL' ? 'All Combined' : `${categoryFilter} Sector`}.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {filteredUsers.map(user => {
          // Questions finished by this user within the current filter
          const userFinished = filteredQuestions.filter(q =>
            userCodes.some(uc => uc.lotNo === user.id && uc.questionId === q.id && uc.passed === true)
          );
          const totalFiltered = filteredQuestions.length;
          const uCat = user.category || getStudentCategory(user);

          return (
            <div key={user.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              {/* User header row */}
              <div className="flex-between" style={{ marginBottom: userFinished.length > 0 ? '1.5rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <User size={24} style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {user.name || user.id}
                      </h3>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: uCat === 'PG' ? 'rgba(255, 0, 255, 0.15)' : 'rgba(0, 245, 155, 0.15)',
                        color: uCat === 'PG' ? '#ff00ff' : '#00f59b',
                        border: `1px solid ${uCat === 'PG' ? '#ff00ff' : '#00f59b'}`
                      }}>
                        {uCat}
                      </span>
                    </div>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
                            <span style={{
                              fontSize: '0.8rem',
                              color: '#00d2ff',
                              background: 'rgba(0, 210, 255, 0.1)',
                              border: '1px solid rgba(0, 210, 255, 0.3)',
                              padding: '0.2rem 0.6rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Clock size={13} />
                              {formatDuration(submission?.durationSeconds)}
                            </span>
                          </div>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        {/* Expandable code block */}
                        {isOpen && (
                          <div style={{ padding: '1rem 1.5rem' }}>
                            {/* Timing Summary Banner */}
                            <div style={{ display: 'flex', gap: '1.5rem', background: '#0a0a0a', padding: '0.8rem 1.2rem', borderRadius: '6px', border: '1px solid #222', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                              <div><span style={{ color: 'var(--text-secondary)' }}>START TIME:</span> <strong style={{ color: '#fff', marginLeft: '6px' }}>{formatTime(submission?.startTime)}</strong></div>
                              <div><span style={{ color: 'var(--text-secondary)' }}>END TIME:</span> <strong style={{ color: '#fff', marginLeft: '6px' }}>{formatTime(submission?.endTime)}</strong></div>
                              <div><span style={{ color: 'var(--text-secondary)' }}>DURATION:</span> <strong style={{ color: '#00d2ff', marginLeft: '6px' }}>{formatDuration(submission?.durationSeconds)}</strong></div>
                            </div>

                            {/* Code Metrics Banner */}
                            {submission?.code && (() => {
                               const metrics = analyzeCode(submission.code);
                               return (
                                 <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(0, 245, 155, 0.05)', padding: '0.8rem 1.2rem', borderRadius: '6px', border: '1px solid rgba(0, 245, 155, 0.2)', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                                   <div><span style={{ color: 'var(--text-secondary)' }}>LINES:</span> <strong style={{ color: '#00f59b', marginLeft: '6px' }}>{metrics.lines}</strong></div>
                                   <div><span style={{ color: 'var(--text-secondary)' }}>LOOPS (for/while):</span> <strong style={{ color: '#00f59b', marginLeft: '6px' }}>{metrics.loops}</strong></div>
                                   <div><span style={{ color: 'var(--text-secondary)' }}>IF/ELSE CONDITIONS:</span> <strong style={{ color: '#00f59b', marginLeft: '6px' }}>{metrics.conditions}</strong></div>
                                   <div><span style={{ color: 'var(--text-secondary)' }}>PRINT STATEMENTS:</span> <strong style={{ color: '#00f59b', marginLeft: '6px' }}>{metrics.prints}</strong></div>
                                 </div>
                               );
                            })()}

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
