import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MatrixRain = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const alphabet = katakana + latin + nums;

    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = [];
    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0'; // Green text
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, opacity: 0.3 }} />;
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="hacker-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      
      <MatrixRain />

      {/* Main Content Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', zIndex: 10 }}>
        
        {/* Header Panel */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="hacker-header-panel"
          style={{ marginBottom: '3rem', maxWidth: '900px', width: '100%' }}
        >
          <h2 style={{ fontSize: '2.4rem', color: '#fff', margin: 0, fontWeight: 800, letterSpacing: '2px', textShadow: '0 0 5px rgba(255,255,255,0.5)' }}>
            AYYA NADAR JANAKI AMMAL COLLEGE
          </h2>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', margin: '0.5rem 0 0 0', fontWeight: 600, letterSpacing: '2px' }}>
            DEPARTMENT OF COMPUTER APPLICATION
          </h3>
        </motion.div>

        {/* Main Title Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
          style={{ marginBottom: '2.5rem' }}
        >
          <h1 className="hacker-title">CODATHAN</h1>
          <h2 className="hacker-subtitle">THE ULTIMATE CODING CHALLENGE</h2>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="hacker-button"
          onClick={() => navigate('/login')}
        >
          &gt; INIT_EVENT
        </motion.button>
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', zIndex: 10, letterSpacing: '1px', opacity: 0.6 }}
      >
        © 2026 Ayya Nadar Janaki Ammal College. Dept. of Computer Application. All rights reserved.
      </motion.div>

    </div>
  );
}
