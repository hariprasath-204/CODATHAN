import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2, UserCheck } from 'lucide-react';
import { syncClock } from '../../utils/timeSync';
import { getStudentCategory } from '../../utils/ranking';

export default function WaitingPage() {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState('Waiting for Admin to start the event...');
  const [eventStatus, setEventStatus] = useState('pending');
  const [lotNo, setLotNo] = useState('');
  const [userInfo, setUserInfo] = useState({
    name: localStorage.getItem('codathan_user_name') || 'Participant',
    rollNo: localStorage.getItem('codathan_user_roll') || '',
    category: localStorage.getItem('codathan_user_category') || 'UG'
  });

  useEffect(() => {
    const userLot = localStorage.getItem('codathan_user');
    if (!userLot) {
      navigate('/login');
      return;
    }
    setLotNo(userLot);
    syncClock(true);

    // Listen to user profile updates while in waiting room
    const unsubUser = onSnapshot(doc(db, 'users', userLot), (userSnap) => {
      if (userSnap.exists()) {
        const u = userSnap.data();
        const cat = u.category || getStudentCategory(u);
        setUserInfo({
          name: u.name || userInfo.name,
          rollNo: u.rollNo || userLot,
          category: cat
        });
        localStorage.setItem('codathan_user_name', u.name || userInfo.name);
        localStorage.setItem('codathan_user_roll', u.rollNo || userLot);
        localStorage.setItem('codathan_user_category', cat);
      }
    });

    // Listen to Global Event Settings
    const unsubEvent = onSnapshot(doc(db, 'event_settings', 'main'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventStatus(data.status || 'pending');

        if (data.status === 'active') {
          await syncClock(true);
          setStatusText('Event is starting! Prepare yourself...');
          setTimeout(() => {
            navigate('/event');
          }, 1500);
        }
      }
    });

    return () => {
      unsubUser();
      unsubEvent();
    };
  }, [navigate]);

  if (eventStatus === 'finished') {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', border: '1px solid var(--accent-success)' }}>
          <h1 className="hacker-title" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>&gt; EVENT_TERMINATED</h1>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '2rem' }}>
            Participant: <span style={{ color: 'var(--accent-primary)' }}>{userInfo.name} ({lotNo})</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
            Thank you for participating in CODATHAN. Your final score and rank will be announced by the coordinators shortly. You may now close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column', padding: '2rem' }}>
      <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.8rem', letterSpacing: '3px', textTransform: 'uppercase', textAlign: 'center' }}>
        WELCOME TO THE EVENT!
      </h1>
      <p style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', letterSpacing: '2px', marginBottom: '2.5rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
        ✦ CODATHAN ARENA WAITING TERMINAL ✦
      </p>

      {/* Participant Identity Badge */}
      <div style={{
        background: 'rgba(0, 240, 255, 0.06)',
        border: '2px solid var(--accent-primary)',
        borderRadius: '12px',
        padding: '1.5rem 3rem',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Participant Name</span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>{userInfo.name}</strong>
        </div>
        
        <div style={{ height: '40px', width: '1px', background: 'var(--glass-border)' }} />
        
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Lot Number</span>
          <span style={{ fontSize: '1.3rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{lotNo}</span>
        </div>

        <div style={{ height: '40px', width: '1px', background: 'var(--glass-border)' }} />
        
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Student Selection</span>
          <span style={{
            fontSize: '1rem',
            padding: '4px 16px',
            borderRadius: '16px',
            background: userInfo.category === 'PG' ? 'rgba(255, 0, 255, 0.2)' : 'rgba(0, 245, 155, 0.2)',
            color: userInfo.category === 'PG' ? '#ff00ff' : '#00f59b',
            border: `1px solid ${userInfo.category === 'PG' ? '#ff00ff' : '#00f59b'}`,
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            {userInfo.category} Student
          </span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', maxWidth: '580px', width: '100%', border: '1px solid var(--glass-border)' }}>
        <Loader2 className="animate-spin" size={60} color="var(--accent-primary)" style={{ margin: '0 auto 2rem auto', animation: 'spin 2s linear infinite' }} />
        <h2 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Hold Tight!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', lineHeight: '1.6' }}>
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
