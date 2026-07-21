import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { getStudentCategory } from '../../utils/ranking';
import { UserCheck, ShieldAlert, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [lotNo, setLotNo] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-lookup user profile as lotNo is typed
  useEffect(() => {
    const cleanLot = lotNo.trim();
    if (!cleanLot) {
      setVerifiedUser(null);
      setError('');
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const userRef = doc(db, 'users', cleanLot);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const cat = data.category || getStudentCategory(data);
          setVerifiedUser({
            name: data.name || 'Participant',
            rollNo: data.rollNo || cleanLot,
            category: cat
          });
          setError('');
        } else {
          setVerifiedUser(null);
        }
      } catch (err) {
        console.error("Lookup error:", err);
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [lotNo]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!lotNo.trim()) {
      setError('Please enter your Lot Number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', lotNo.trim());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const cat = data.category || getStudentCategory(data);

        // Increment login count
        await updateDoc(userRef, {
          loginCount: increment(1)
        });
        
        // Save profile to local storage for session
        localStorage.setItem('codathan_user', lotNo.trim());
        localStorage.setItem('codathan_user_name', data.name || 'Participant');
        localStorage.setItem('codathan_user_roll', data.rollNo || lotNo.trim());
        localStorage.setItem('codathan_user_category', cat);

        navigate('/waiting');
      } else {
        setError('Invalid Lot Number. Please contact the coordinator/administrator.');
      }
    } catch (err) {
      console.error(err);
      setError('Error connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: '100vh' }}>
      <div className="glass-panel" style={{ padding: '2.8rem', width: '100%', maxWidth: '440px', border: '1px solid var(--glass-border)' }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '2.2rem' }}>Participant Login</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Enter your assigned Lot Number. Your details will load automatically.
        </p>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Lot Number</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Enter your Lot No (e.g., L-101)" 
                value={lotNo}
                onChange={(e) => setLotNo(e.target.value)}
                style={{ width: '100%', paddingRight: '2.5rem' }}
                autoFocus
              />
              {checking && (
                <Loader2 className="animate-spin" size={20} color="var(--accent-primary)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              )}
            </div>
          </div>

          {/* Auto-displayed Read-Only Student Info Card */}
          <div style={{
            background: verifiedUser ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${verifiedUser ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
            borderRadius: '8px',
            padding: '1.2rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', color: verifiedUser ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
              <UserCheck size={18} />
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {verifiedUser ? 'VERIFIED PARTICIPANT PROFILE' : 'STUDENT DETAILS (AUTO-DISPLAY)'}
              </span>
            </div>

            {verifiedUser ? (
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Student Name:</span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{verifiedUser.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Roll / ID No:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{verifiedUser.rollNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Student Selection:</span>
                  <span style={{
                    padding: '0.2rem 0.8rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    background: verifiedUser.category === 'PG' ? 'rgba(255, 0, 255, 0.2)' : 'rgba(0, 245, 155, 0.2)',
                    color: verifiedUser.category === 'PG' ? '#ff00ff' : '#00f59b',
                    border: `1px solid ${verifiedUser.category === 'PG' ? '#ff00ff' : '#00f59b'}`
                  }}>
                    {verifiedUser.category} Student
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, textAlign: 'center', fontStyle: 'italic' }}>
                {lotNo.trim() ? 'No profile found for this Lot Number yet...' : 'Enter your Lot Number above to load Name and UG/PG Category (Read-Only).'}
              </p>
            )}
          </div>
          
          <button type="submit" className="primary flex-center" disabled={loading || !verifiedUser} style={{ padding: '1rem', fontSize: '1.1rem' }}>
            {loading ? 'Verifying...' : 'ENTER ARENA'}
          </button>
        </form>
      </div>
    </div>
  );
}
