import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import Editor from '@monaco-editor/react';
import { Eye, Code2, User } from 'lucide-react';

export default function LiveCode() {
  const [users,     setUsers]     = useState([]);
  const [allCodes,  setAllCodes]  = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search,    setSearch]    = useState('');

  // Load all users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  // Load all live code (real-time)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'user_code'), snap =>
      setAllCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  // Filter codes for selected user
  const userCodes = selectedUser
    ? allCodes.filter(c => c.lotNo === selectedUser.id)
    : [];

  // Selected code snippet to view
  const [selectedCode, setSelectedCode] = useState(null);

  // Reset selected code when user changes
  useEffect(() => {
    setSelectedCode(null);
  }, [selectedUser]);

  // Filtered user list
  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.id?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', height: 'calc(100vh - 4rem)' }}>

      {/* Left: User List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', overflow: 'hidden' }}>
        <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>
          <Eye size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Live Code Tracker
        </h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search lot no or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '0.6rem 0.8rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            outline: 'none',
            width: '100%',
          }}
        />

        {/* User cards */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredUsers.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              No users found.
            </p>
          )}
          {filteredUsers.map(u => {
            const codeCount = allCodes.filter(c => c.lotNo === u.id).length;
            const isSelected = selectedUser?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: isSelected
                    ? '2px solid var(--accent-primary)'
                    : '1px solid var(--glass-border)',
                  background: isSelected
                    ? 'rgba(0,255,0,0.08)'
                    : 'var(--bg-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{u.id}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {u.name || '—'} &nbsp;·&nbsp; {codeCount} snippet{codeCount !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Code Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', overflow: 'hidden' }}>

        {!selectedUser ? (
          <div className="glass-panel flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-secondary)' }}>
            <Code2 size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <p>Select a user from the left to view their live code.</p>
          </div>
        ) : (
          <>
            {/* Question tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)', alignSelf: 'center', marginRight: '0.5rem' }}>
                {selectedUser.name || selectedUser.id}
              </span>
              {userCodes.length === 0 ? (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', alignSelf: 'center' }}>
                  No code submitted yet.
                </span>
              ) : (
                userCodes.map(uc => (
                  <button
                    key={uc.id}
                    className={selectedCode?.id === uc.id ? 'primary' : 'secondary'}
                    onClick={() => setSelectedCode(uc)}
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                  >
                    Q-{uc.questionId?.substring(0, 5).toUpperCase()}
                    {uc.passed && ' ✅'}
                  </button>
                ))
              )}
            </div>

            {/* Monaco Editor */}
            <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', padding: '0.5rem' }}>
              {selectedCode ? (
                <>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', paddingLeft: '0.5rem' }}>
                    Language: <strong>{selectedCode.language}</strong>
                    &nbsp;·&nbsp; Last updated: {selectedCode.timestamp?.toDate().toLocaleTimeString()}
                    {selectedCode.passed && <span style={{ color: 'var(--accent-success)', marginLeft: '0.5rem' }}>✅ Passed</span>}
                  </div>
                  <Editor
                    height="calc(100% - 24px)"
                    theme="vs-dark"
                    language="cpp"
                    value={selectedCode.code || ''}
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
                  />
                </>
              ) : (
                <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
                  Select a question snippet above to view the code.
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
