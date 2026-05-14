import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function RoundSetting() {
  const [rounds, setRounds] = useState([]);
  const [roundName, setRoundName] = useState('Round 1');
  const [numQuestions, setNumQuestions] = useState(3);
  const [loading, setLoading] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState(null);

  // Global Event State
  const [eventData, setEventData] = useState(null);
  const [eventDurationInput, setEventDurationInput] = useState(120);

  useEffect(() => {
    // Listen to rounds
    const unsubscribeRounds = onSnapshot(collection(db, 'rounds'), (snapshot) => {
      let fetchedRounds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedRounds.sort((a, b) => {
        const timeA = a.createdAt?.toDate().getTime() || 0;
        const timeB = b.createdAt?.toDate().getTime() || 0;
        return timeA - timeB; // Sort ascending (Round 1, Round 2)
      });
      setRounds(fetchedRounds);
    });

    // Listen to Global Event Settings
    const unsubscribeEvent = onSnapshot(doc(db, 'event_settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventData(data);
        if (data.duration) setEventDurationInput(Math.floor(data.duration / 60));
      } else {
        setEventData({ status: 'pending', duration: 120 * 60 });
      }
    });

    return () => {
      unsubscribeRounds();
      unsubscribeEvent();
    };
  }, []);

  const handleSaveEventSettings = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000)); // Artificial delay for UI feedback
    await updateDoc(doc(db, 'event_settings', 'main'), {
      duration: parseInt(eventDurationInput) * 60
    }).catch(async (e) => {
      // If document doesn't exist, set it
      await setDoc(doc(db, 'event_settings', 'main'), {
        status: 'pending',
        duration: parseInt(eventDurationInput) * 60
      });
    });
    setLoading(false);
  };

  const [eventConfirmPopup, setEventConfirmPopup] = useState(null);

  const handleStartEvent = () => {
    setEventConfirmPopup({
      title: 'Start Event',
      message: 'Are you sure you want to START the event for all users? This will begin the countdown timer.',
      btnText: 'Yes, Start Event',
      btnClass: 'success',
      action: async () => {
        setEventConfirmPopup(null);
        setLoading(true);
        await new Promise(r => setTimeout(r, 1500));
        await setDoc(doc(db, 'event_settings', 'main'), {
          status: 'active',
          duration: parseInt(eventDurationInput) * 60,
          startTime: new Date()
        }, { merge: true });
        setLoading(false);
      }
    });
  };

  const handleEndEvent = () => {
    setEventConfirmPopup({
      title: 'End Event Early',
      message: 'Are you sure you want to END the event early? All users will be redirected to the waiting room.',
      btnText: 'Yes, End Event',
      btnClass: 'danger',
      action: async () => {
        setEventConfirmPopup(null);
        setLoading(true);
        await new Promise(r => setTimeout(r, 1500));
        await setDoc(doc(db, 'event_settings', 'main'), {
          status: 'finished',
          endTime: new Date()
        }, { merge: true });
        setLoading(false);
      }
    });
  };

  const handleResetEvent = () => {
    setEventConfirmPopup({
      title: 'Reset Event',
      message: 'Are you sure you want to RESET the event to pending? The timer will be cleared.',
      btnText: 'Yes, Reset',
      btnClass: 'secondary',
      action: async () => {
        setEventConfirmPopup(null);
        setLoading(true);
        await new Promise(r => setTimeout(r, 1000));
        await setDoc(doc(db, 'event_settings', 'main'), {
          status: 'pending',
          duration: parseInt(eventDurationInput) * 60
        });
        setLoading(false);
      }
    });
  };

  const handleSaveRound = async () => {
    if (!roundName.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    try {
      if (editingRoundId) {
        await updateDoc(doc(db, 'rounds', editingRoundId), {
          name: roundName,
          numberOfQuestions: parseInt(numQuestions)
        });
        setEditingRoundId(null);
      } else {
        await addDoc(collection(db, 'rounds'), {
          name: roundName,
          numberOfQuestions: parseInt(numQuestions),
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
    setRoundName('Round ' + (rounds.length + 2));
    setNumQuestions(3);
  };

  const handleEditRound = (round) => {
    setEditingRoundId(round.id);
    setRoundName(round.name || 'Round');
    setNumQuestions(round.numberOfQuestions || 3);
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
      const qSnap = await getDocs(query(collection(db, 'questions'), where('roundId', '==', deleteTargetId)));
      const deletePromises = qSnap.docs.map(qDoc => deleteDoc(doc(db, 'questions', qDoc.id)));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'rounds', deleteTargetId));
    } catch (error) {
      console.error("Error deleting round:", error);
      alert("Failed to delete round: " + error.message);
    }
    setLoading(false);
    setDeleteTargetId(null);
  };

  return (
    <div>
      {loading && <LoadingOverlay message="Processing Database Operation..." />}
      <h2 style={{ marginBottom: '2rem' }}>Global Event Setting</h2>

      {/* Custom Event Action Confirmation Popup */}
      {eventConfirmPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', minWidth: '300px' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{eventConfirmPopup.title}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{eventConfirmPopup.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="secondary" onClick={() => setEventConfirmPopup(null)}>Cancel</button>
              <button className={eventConfirmPopup.btnClass} onClick={eventConfirmPopup.action}>{eventConfirmPopup.btnText}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Popup for Deletion */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', minWidth: '300px' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Are you sure?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>This will permanently delete this round and ALL questions associated with it.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="danger" onClick={confirmDelete}>Yes, Delete Everything</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Event Panel */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: eventData?.status === 'active' ? '2px solid var(--accent-success)' : '' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: eventData?.status === 'active' ? 'var(--accent-success)' : 'inherit' }}>
              Event Status: {(eventData?.status || 'PENDING').toUpperCase()}
            </h3>
            {eventData?.startTime && eventData?.status === 'active' && (
              <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Started at: {eventData.startTime.toDate().toLocaleTimeString()}</p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Total Event Duration (min)</label>
              <input 
                type="number" 
                value={eventDurationInput} 
                onChange={(e) => setEventDurationInput(e.target.value)} 
                min="1"
              />
            </div>
            <button className="secondary" onClick={handleSaveEventSettings} disabled={loading || eventData?.status === 'active'}>
              Save Time
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          {eventData?.status !== 'active' && (
            <button className="success" onClick={handleStartEvent} style={{ flex: 1, padding: '1rem', fontSize: '1.2rem' }}>START EVENT</button>
          )}
          {eventData?.status === 'active' && (
            <button className="danger" onClick={handleEndEvent} style={{ flex: 1, padding: '1rem', fontSize: '1.2rem' }}>END EVENT EARLY</button>
          )}
          {eventData?.status === 'finished' && (
            <button className="secondary" onClick={handleResetEvent} style={{ flex: 1, padding: '1rem', fontSize: '1.2rem' }}>RESET EVENT</button>
          )}
        </div>
      </div>

      {/* Round Management */}
      <h2 style={{ marginBottom: '1rem', marginTop: '3rem' }}>Event Rounds (Levels)</h2>
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3>{editingRoundId ? 'Edit Round' : 'Add New Round Sequence'}</h3>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Round Name</label>
            <input 
              type="text" 
              value={roundName} 
              onChange={(e) => setRoundName(e.target.value)} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Number of Questions (Target)</label>
            <input 
              type="number" 
              value={numQuestions} 
              onChange={(e) => setNumQuestions(e.target.value)} 
              min="1"
            />
          </div>
          <button className="success" onClick={handleSaveRound} disabled={loading} style={{ marginTop: '1.5rem' }}>
            {loading ? 'Saving...' : (editingRoundId ? 'Update Round' : 'Add Round')}
          </button>
          {editingRoundId && (
            <button className="secondary" onClick={() => { setEditingRoundId(null); setRoundName('Round ' + (rounds.length + 1)); setNumQuestions(3); }} style={{ marginTop: '1.5rem' }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', marginTop: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem' }}>Order</th>
              <th style={{ padding: '1rem' }}>Round Name</th>
              <th style={{ padding: '1rem' }}>Questions Target</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round, index) => (
              <tr key={round.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>Level {index + 1}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{round.name || round.id}</td>
                <td style={{ padding: '1rem' }}>{round.numberOfQuestions || '-'}</td>
                <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="secondary" onClick={() => handleEditRound(round)}>Edit</button>
                  <button className="danger" onClick={() => requestDelete(round.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {rounds.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>No rounds added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
