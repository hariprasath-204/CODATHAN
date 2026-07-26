import React, { useState } from 'react';
import { db, dbUG, dbPG } from '../../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export default function ResetData() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState(null); // 'success' or 'error'

  const handleReset = async () => {
    setIsDeleting(true);
    setStatus(null);
    try {
      const collectionsToWipe = ['users', 'user_code', 'logs', 'compiler_alerts'];
      let totalDocs = 0;
      let deletedDocs = 0;

      // First pass: count total documents to delete
      const allDocs = [];
      for (const collName of collectionsToWipe) {
        const snap = await getDocs(collection(db, collName));
        totalDocs += snap.size;
        snap.forEach(d => {
          allDocs.push({ dbInstance: db, collName, id: d.id });
        });
      }

      const snapUG = await getDocs(collection(dbUG, 'user_code'));
      totalDocs += snapUG.size;
      snapUG.forEach(d => allDocs.push({ dbInstance: dbUG, collName: 'user_code', id: d.id }));

      const snapPG = await getDocs(collection(dbPG, 'user_code'));
      totalDocs += snapPG.size;
      snapPG.forEach(d => allDocs.push({ dbInstance: dbPG, collName: 'user_code', id: d.id }));

      setProgress({ current: 0, total: totalDocs });

      if (totalDocs === 0) {
        setStatus('success');
        setIsDeleting(false);
        setIsConfirming(false);
        return;
      }

      // Second pass: delete them
      for (const item of allDocs) {
        await deleteDoc(doc(item.dbInstance, item.collName, item.id));
        deletedDocs++;
        setProgress({ current: deletedDocs, total: totalDocs });
      }

      setStatus('success');
    } catch (error) {
      console.error("Error resetting data:", error);
      setStatus('error');
    }
    setIsDeleting(false);
    setIsConfirming(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div className="glass-panel" style={{ border: '2px solid var(--accent-danger)' }}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Trash2 size={48} color="var(--accent-danger)" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ color: 'var(--accent-danger)', marginBottom: '1rem' }}>Reset Event Data</h1>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            This action will permanently delete all participant data. This includes all registered <strong>users</strong>, submitted <strong>code snippets</strong>, and system <strong>logs</strong>.
            <br/><br/>
            Your event configuration (Questions, Rounds, and Settings) will <strong>NOT</strong> be deleted.
          </p>

          {status === 'success' && (
            <div style={{ background: 'rgba(0, 255, 0, 0.1)', border: '1px solid var(--accent-success)', padding: '1rem', borderRadius: '8px', color: 'var(--accent-success)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} /> Data successfully reset!
            </div>
          )}

          {status === 'error' && (
            <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--accent-danger)', padding: '1rem', borderRadius: '8px', color: 'var(--accent-danger)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} /> An error occurred while resetting data. Please check the console.
            </div>
          )}

          {!isConfirming ? (
            <button 
              className="danger" 
              onClick={() => {
                setIsConfirming(true);
                setStatus(null);
              }}
              style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}
            >
              Wipe All Participant Data
            </button>
          ) : (
            <div style={{ background: 'var(--bg-tertiary)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--accent-warning)' }}>
              <h3 style={{ color: 'var(--accent-warning)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={24} /> Are you absolutely sure?
              </h3>
              <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                This action cannot be undone. All student progress will be lost forever.
              </p>
              
              {isDeleting ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
                  <p style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                    Deleting {progress.current} / {progress.total} documents...
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="secondary" onClick={() => setIsConfirming(false)}>
                    Cancel
                  </button>
                  <button className="danger" onClick={handleReset}>
                    Yes, Permanently Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
