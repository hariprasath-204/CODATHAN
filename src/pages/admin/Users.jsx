import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, setDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [lotNo, setLotNo] = useState('');
  const [name, setName] = useState('');
  const [flags, setFlags] = useState(0);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const uSnap = await getDocs(collection(db, 'users'));
    setUsers(uSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!lotNo.trim() && !editingUserId) return;
    
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    try {
      if (editingUserId) {
        await updateDoc(doc(db, 'users', editingUserId), {
          name: name.trim(),
          flags: parseInt(flags),
          totalPoints: parseInt(points)
        });
        setEditingUserId(null);
      } else {
        await setDoc(doc(db, 'users', lotNo.trim()), {
          name: name.trim(),
          loginCount: 0,
          totalPoints: 0,
          flags: 0,
          completedQuestions: 0
        });
      }
      setLotNo('');
      setName('');
      setFlags(0);
      setPoints(0);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleEditUser = (u) => {
    setEditingUserId(u.id);
    setLotNo(u.id);
    setName(u.name || '');
    setFlags(u.flags || 0);
    setPoints(u.totalPoints || 0);
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const requestDelete = (id) => {
    setDeleteTargetId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setShowConfirm(false);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    await deleteDoc(doc(db, 'users', deleteTargetId));
    setDeleteTargetId(null);
    await fetchUsers();
  };

  return (
    <div>
      {loading && <LoadingOverlay message="Processing Users..." />}
      <h2 style={{ marginBottom: '2rem' }}>User Management</h2>

      {/* Confirmation Popup */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', minWidth: '300px' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Are you sure?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Remove this participant from the event?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="danger" onClick={confirmDelete}>Yes, Remove User</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3>{editingUserId ? 'Edit Participant' : 'Add Participant'}</h3>
        <form onSubmit={handleSaveUser} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Lot Number (ID)</label>
            <input type="text" value={lotNo} onChange={(e) => setLotNo(e.target.value)} required disabled={!!editingUserId} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name (Optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {editingUserId && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Flags</label>
                <input type="number" value={flags} onChange={(e) => setFlags(e.target.value)} style={{ width: '80px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Points</label>
                <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} style={{ width: '80px' }} />
              </div>
            </>
          )}
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Saving...' : (editingUserId ? 'Update User' : 'Add User')}
          </button>
          {editingUserId && (
            <button type="button" className="secondary" onClick={() => { setEditingUserId(null); setLotNo(''); setName(''); setFlags(0); setPoints(0); }}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <h3>Registered Participants</h3>
      <div className="glass-panel" style={{ overflow: 'hidden', marginTop: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem' }}>Lot No</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Flags</th>
              <th style={{ padding: '1rem' }}>Points</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{user.id}</td>
                <td style={{ padding: '1rem' }}>{user.name || '-'}</td>
                <td style={{ padding: '1rem', color: user.flags > 0 ? 'var(--accent-danger)' : 'inherit' }}>{user.flags || 0}</td>
                <td style={{ padding: '1rem' }}>{user.totalPoints || 0}</td>
                <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="secondary" onClick={() => handleEditUser(user)}>Edit</button>
                  <button className="danger" onClick={() => requestDelete(user.id)}>Remove</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>No users added.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
