import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';
import Confetti from 'react-confetti';
// using custom window size hook/state below

export default function FinalWinners() {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // 0: None, 1: 3rd, 2: 2nd, 3: 1st

  // fallback for window size if react-use is not installed
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchWinners = async () => {
      const q = collection(db, 'users');
      try {
        const snapshot = await getDocs(q);
        let fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        fetchedUsers.sort((a, b) => {
          const aFlag = (a.flags || 0) > 0 ? 1 : 0;
          const bFlag = (b.flags || 0) > 0 ? 1 : 0;
          if (aFlag !== bFlag) return aFlag - bFlag;

          const aPoints = a.totalPoints || 0;
          const bPoints = b.totalPoints || 0;
          if (aPoints !== bPoints) return bPoints - aPoints;

          const aTime = a.lastSubmitTime ? (a.lastSubmitTime.toMillis ? a.lastSubmitTime.toMillis() : a.lastSubmitTime) : Infinity;
          const bTime = b.lastSubmitTime ? (b.lastSubmitTime.toMillis ? b.lastSubmitTime.toMillis() : b.lastSubmitTime) : Infinity;
          if (aTime !== bTime) return aTime - bTime;

          const aQs = a.completedQuestions || 0;
          const bQs = b.completedQuestions || 0;
          return bQs - aQs;
        });

        // Filter out disqualified and get top 3
        const top3 = fetchedUsers.filter(u => (u.flags || 0) === 0).slice(0, 3);
        setWinners(top3);
      } catch (error) {
        console.error("Error fetching winners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, []);

  const handleReveal = () => {
    if (revealStep < 3) {
      setRevealStep(prev => prev + 1);
      if (revealStep === 2) {
        // Trigger confetti when 1st place is revealed
        setTimeout(() => setShowConfetti(true), 500);
      }
    }
  };

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <h2 className="text-gradient">Calculating Final Results...</h2>
      </div>
    );
  }

  // Handle case where we have less than 3 valid winners
  const thirdPlace = winners[2];
  const secondPlace = winners[1];
  const firstPlace = winners[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={800} />}
      
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at center, rgba(43, 45, 66, 0.5) 0%, var(--bg-primary) 100%)', zIndex: 0 }}></div>

      <div style={{ zIndex: 10, textAlign: 'center', marginTop: '4rem', marginBottom: '4rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '4rem', letterSpacing: '2px' }}>CODATHAN 2k27</h1>
        <h2 style={{ color: 'var(--text-secondary)', fontSize: '2rem', marginTop: '1rem' }}>Final Champions</h2>
      </div>

      <div style={{ zIndex: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2rem', height: '500px', width: '100%', maxWidth: '1000px', paddingBottom: '2rem' }}>
        
        {/* 3rd Place */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: revealStep >= 1 ? 1 : 0, transition: 'opacity 0.5s' }}>
          {revealStep >= 1 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', width: '100%', background: 'rgba(205, 127, 50, 0.1)', border: '2px solid #cd7f32', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#cd7f32', fontSize: '2rem' }}>LOT {thirdPlace?.id || '--'}</h3>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>{thirdPlace?.totalPoints || 0} pts</p>
              </div>
              <div style={{ height: '150px', width: '100%', background: 'linear-gradient(to top, #cd7f32, rgba(205, 127, 50, 0.2))', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'center', paddingTop: '1rem' }}>
                <Trophy size={48} color="#fff" />
              </div>
            </motion.div>
          )}
        </div>

        {/* 1st Place */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: revealStep >= 3 ? 1 : 0, transition: 'opacity 0.5s' }}>
          {revealStep >= 3 && (
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.6, duration: 1 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', width: '100%', background: 'rgba(255, 215, 0, 0.15)', border: '3px solid #ffd700', marginBottom: '1rem', boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)' }}>
                <Medal size={48} color="#ffd700" style={{ marginBottom: '1rem' }} />
                <h2 style={{ margin: 0, color: '#ffd700', fontSize: '3rem' }}>LOT {firstPlace?.id || '--'}</h2>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>{firstPlace?.totalPoints || 0} pts</p>
              </div>
              <div style={{ height: '250px', width: '100%', background: 'linear-gradient(to top, #ffd700, rgba(255, 215, 0, 0.2))', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'center', paddingTop: '1rem' }}>
                <Trophy size={64} color="#fff" />
              </div>
            </motion.div>
          )}
        </div>

        {/* 2nd Place */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: revealStep >= 2 ? 1 : 0, transition: 'opacity 0.5s' }}>
          {revealStep >= 2 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', width: '100%', background: 'rgba(192, 192, 192, 0.1)', border: '2px solid #c0c0c0', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#c0c0c0', fontSize: '2rem' }}>LOT {secondPlace?.id || '--'}</h3>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>{secondPlace?.totalPoints || 0} pts</p>
              </div>
              <div style={{ height: '200px', width: '100%', background: 'linear-gradient(to top, #c0c0c0, rgba(192, 192, 192, 0.2))', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'center', paddingTop: '1rem' }}>
                <Trophy size={48} color="#fff" />
              </div>
            </motion.div>
          )}
        </div>

      </div>

      <div style={{ zIndex: 10, position: 'absolute', bottom: '2rem' }}>
        {revealStep < 3 ? (
          <button className="primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', borderRadius: '30px' }} onClick={handleReveal}>
            Reveal {revealStep === 0 ? '3rd Place' : revealStep === 1 ? '2nd Place' : '1st Place'}
          </button>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>Congratulations to the Winners!</h3>
          </motion.div>
        )}
      </div>

    </div>
  );
}
