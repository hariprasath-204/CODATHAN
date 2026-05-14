import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function WaitingPage() {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState('Waiting for Admin to start the event...');
  const [eventStatus, setEventStatus] = useState('pending');
  const [lotNo, setLotNo] = useState('');

  useEffect(() => {
    const userLot = localStorage.getItem('codathan_user');
    if (!userLot) {
      navigate('/login');
      return;
    }
    setLotNo(userLot);

    // Listen to Global Event Settings
    const unsubEvent = onSnapshot(doc(db, 'event_settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventStatus(data.status || 'pending');

        if (data.status === 'active') {
          setStatusText('Event is starting! Prepare yourself...');
          setTimeout(() => {
            navigate('/event');
          }, 2000);
        }
      }
    });

    return () => unsubEvent();
  }, [navigate]);

  if (eventStatus === 'finished') {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', border: '1px solid var(--accent-success)' }}>
          <h1 className="hacker-title" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>&gt; EVENT_TERMINATED</h1>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '2rem' }}>
            User: <span style={{ color: 'var(--accent-primary)' }}>{lotNo}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
            Thank you for participating in CODATHAN. Your final score and rank will be announced by the coordinators shortly. You may now close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
        <Loader2 className="animate-spin" size={64} color="var(--accent-primary)" style={{ margin: '0 auto 2rem auto', animation: 'spin 2s linear infinite' }} />
        <h2 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Hold Tight!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
          {statusText}
        </p>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
