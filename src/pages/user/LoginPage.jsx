import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export default function LoginPage() {
  const [lotNo, setLotNo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!lotNo.trim()) {
      setError('Please enter a valid Lot Number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', lotNo.trim());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // Increment login count
        await updateDoc(userRef, {
          loginCount: increment(1)
        });
        
        // Save to local storage for session
        localStorage.setItem('codathan_user', lotNo.trim());
        navigate('/waiting');
      } else {
        setError('Invalid Lot Number. Please contact the administrator.');
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
      <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Participant Login</h2>
        
        {error && (
          <div style={{ background: 'var(--accent-danger)', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Lot Number</label>
            <input 
              type="text" 
              placeholder="Enter your Lot No (e.g., L-101)" 
              value={lotNo}
              onChange={(e) => setLotNo(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Verifying...' : 'Enter Arena'}
          </button>
        </form>
      </div>
    </div>
  );
}
