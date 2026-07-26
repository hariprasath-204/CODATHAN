import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  
  const initialForm = {
    title: '', description: '', difficulty: 'Easy', points: 10, roundId: '', category: 'BOTH',
    visibleInput: '', visibleOutput: '', hiddenInput: '', hiddenOutput: '', defaultCode: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const unsubQ = onSnapshot(collection(db, 'questions'), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubR = onSnapshot(collection(db, 'rounds'), (snapshot) => {
      const fetchedRounds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRounds(fetchedRounds);
      if (fetchedRounds.length > 0 && !formData.roundId) {
        setFormData(prev => ({ ...prev, roundId: fetchedRounds[0].id }));
      }
    });
    return () => { unsubQ(); unsubR(); };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    try {
      if (editingQuestionId) {
        await updateDoc(doc(db, 'questions', editingQuestionId), formData);
        setEditingQuestionId(null);
      } else {
        await addDoc(collection(db, 'questions'), formData);
      }
      setFormData(initialForm);
      if (rounds.length > 0) {
        setFormData(prev => ({ ...prev, roundId: rounds[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleEdit = (q) => {
    setEditingQuestionId(q.id);
    setFormData({
      title: q.title || '', description: q.description || '', difficulty: q.difficulty || 'Easy',
      points: q.points || 10, roundId: q.roundId || (rounds.length > 0 ? rounds[0].id : ''),
      category: q.category || 'BOTH',
      visibleInput: q.visibleInput || '', visibleOutput: q.visibleOutput || '',
      hiddenInput: q.hiddenInput || '', hiddenOutput: q.hiddenOutput || '',
      defaultCode: q.defaultCode || ''
    });
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
    try {
      await deleteDoc(doc(db, 'questions', deleteTargetId));
    } catch (err) {
      console.error(err);
      alert("Error deleting: " + err.message);
    }
    setLoading(false);
    setDeleteTargetId(null);
  };

  return (
    <div>
      {loading && <LoadingOverlay message="Processing Database Operation..." />}
      <h2 style={{ marginBottom: '2rem' }}>Manage Questions</h2>

      {/* Confirmation Popup */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', minWidth: '300px' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Are you sure?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Do you really want to delete this question? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="danger" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3>{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h3>
        <form onSubmit={handleSaveQuestion} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div className="grid-cols-2">
            <div>
              <label>Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Round</label>
                <select name="roundId" value={formData.roundId} onChange={handleChange} style={{ width: '100%' }} required>
                  {rounds.length === 0 && <option value="">No rounds available</option>}
                  {rounds.map(r => (
                    <option key={r.id} value={r.id}>{r.name || 'Round ' + r.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Target Category</label>
                <select name="category" value={formData.category} onChange={handleChange} style={{ width: '100%' }}>
                  <option value="BOTH">BOTH (Universal)</option>
                  <option value="UG">UG Students Only</option>
                  <option value="PG">PG Students Only</option>
                </select>
              </div>
              <div>
                <label>Difficulty</label>
                <select name="difficulty" value={formData.difficulty} onChange={handleChange} style={{ width: '100%' }}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
          </div>
          
          <div>
            <label>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required style={{ width: '100%', minHeight: '100px' }}></textarea>
          </div>

          <div>
            <label>Default Starter Code (Optional - Replaces standard templates)</label>
            <textarea name="defaultCode" value={formData.defaultCode} onChange={handleChange} style={{ width: '100%', minHeight: '100px', fontFamily: 'monospace' }} placeholder="Enter boilerplate code here..."></textarea>
          </div>

          <div>
            <label>Points</label>
            <input type="number" name="points" value={formData.points} onChange={handleChange} required style={{ width: '100%' }} />
          </div>

          <div className="grid-cols-2">
            <div>
              <label>Visible Input</label>
              <textarea name="visibleInput" value={formData.visibleInput} onChange={handleChange} style={{ width: '100%' }}></textarea>
            </div>
            <div>
              <label>Visible Output</label>
              <textarea name="visibleOutput" value={formData.visibleOutput} onChange={handleChange} style={{ width: '100%' }}></textarea>
            </div>
          </div>

          <div className="grid-cols-2">
            <div>
              <label style={{ color: 'var(--accent-danger)' }}>Hidden Input (Test Cases)</label>
              <textarea name="hiddenInput" value={formData.hiddenInput} onChange={handleChange} style={{ width: '100%' }}></textarea>
            </div>
            <div>
              <label style={{ color: 'var(--accent-danger)' }}>Hidden Output</label>
              <textarea name="hiddenOutput" value={formData.hiddenOutput} onChange={handleChange} style={{ width: '100%' }}></textarea>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Saving...' : (editingQuestionId ? 'Update Question' : 'Add Question')}
            </button>
            {editingQuestionId && (
              <button type="button" className="secondary" onClick={() => { setEditingQuestionId(null); setFormData(initialForm); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <h3>Existing Questions</h3>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {questions.map(q => (
          <div key={q.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.3rem' }}>
                <h4 style={{ margin: 0 }}>{q.title}</h4>
                <span style={{
                  padding: '0.15rem 0.6rem',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  background: q.category === 'PG' ? 'rgba(255, 0, 255, 0.15)' : q.category === 'UG' ? 'rgba(0, 245, 155, 0.15)' : 'rgba(0, 240, 255, 0.15)',
                  color: q.category === 'PG' ? '#ff00ff' : q.category === 'UG' ? '#00f59b' : '#00f0ff',
                  border: `1px solid ${q.category === 'PG' ? '#ff00ff' : q.category === 'UG' ? '#00f59b' : '#00f0ff'}`
                }}>
                  {q.category || 'BOTH'}
                </span>
              </div>
              <small style={{ color: 'var(--text-secondary)' }}>
                {rounds.find(r => r.id === q.roundId)?.name || 'Round ' + q.roundId} | {q.difficulty} | {q.points} pts
              </small>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="secondary" onClick={() => handleEdit(q)}>Edit</button>
              <button className="danger" onClick={() => requestDelete(q.id)}>Delete</button>
            </div>
          </div>
        ))}
        {questions.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No questions added.</p>}
      </div>
    </div>
  );
}
