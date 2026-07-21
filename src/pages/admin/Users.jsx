import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, setDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';
import { getStudentCategory } from '../../utils/ranking';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [lotNo, setLotNo] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('UG');
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
    if (!name.trim() || !category) {
      alert('Please fill in Name, Lot/Roll Number, and Student Selection (UG/PG).');
      return;
    }
    
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    try {
      if (editingUserId) {
        await updateDoc(doc(db, 'users', editingUserId), {
          name: name.trim(),
          rollNo: editingUserId,
          category: category,
          flags: parseInt(flags),
          totalPoints: parseInt(points)
        });
        setEditingUserId(null);
      } else {
        await setDoc(doc(db, 'users', lotNo.trim()), {
          name: name.trim(),
          rollNo: lotNo.trim(),
          category: category,
          loginCount: 0,
          totalPoints: 0,
          flags: 0,
          completedQuestions: 0
        });
      }
      setLotNo('');
      setName('');
      setCategory('UG');
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
    setCategory(u.category || getStudentCategory(u));
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
        <form onSubmit={handleSaveUser} style={{ display: 'grid', gap: '1rem', marginTop: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Lot / Roll Number (ID) *</label>
            <input type="text" value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="e.g. 23UCA201" required disabled={!!editingUserId} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Student Selection *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} required>
              <option value="UG">UG Student</option>
              <option value="PG">PG Student</option>
            </select>
          </div>
          {editingUserId && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Flags</label>
                <input type="number" value={flags} onChange={(e) => setFlags(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Points</label>
                <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} style={{ width: '100%' }} />
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="primary" disabled={loading} style={{ flex: 1, padding: '0.65rem' }}>
              {loading ? 'Saving...' : (editingUserId ? 'Update' : 'Add User')}
            </button>
            {editingUserId && (
              <button type="button" className="secondary" onClick={() => { setEditingUserId(null); setLotNo(''); setName(''); setCategory('UG'); setFlags(0); setPoints(0); }} style={{ padding: '0.65rem' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <h3>Registered Participants</h3>
      <div className="glass-panel" style={{ overflow: 'hidden', marginTop: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem' }}>Lot / Roll No</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Category</th>
              <th style={{ padding: '1rem' }}>Flags</th>
              <th style={{ padding: '1rem' }}>Points</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const uCat = user.category || getStudentCategory(user);
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
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
                  <td style={{ padding: '1rem', color: user.flags > 0 ? 'var(--accent-danger)' : 'inherit' }}>{user.flags || 0}</td>
                  <td style={{ padding: '1rem' }}>{user.totalPoints || 0}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="secondary" onClick={() => handleEditUser(user)}>Edit</button>
                    <button className="danger" onClick={() => requestDelete(user.id)}>Remove</button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>No users added.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
