import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ message = "Loading..." }) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Ensure it sits above absolutely everything
        flexDirection: 'column'
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="glass-panel"
        style={{
          padding: '3rem 4rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          border: '1px solid var(--accent-primary)',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.2)'
        }}
      >
        <Loader2 
          size={48} 
          className="animate-spin" 
          style={{ color: 'var(--accent-primary)' }} 
        />
        <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
          {message}<motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>_</motion.span>
        </h2>
      </motion.div>
    </div>
  );
}
