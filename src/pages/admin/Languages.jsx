import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Code2, Settings2, Power, PowerOff } from 'lucide-react';

export default function Languages() {
  const [languages, setLanguages] = useState({
    c: false,
    cpp: true,
    java: false,
    python: false
  });

  // Load language settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'event_settings', 'languages'), (docSnap) => {
      if (docSnap.exists()) {
        setLanguages(docSnap.data());
      } else {
        // Create default if not exists
        setDoc(doc(db, 'event_settings', 'languages'), {
          c: false,
          cpp: true,
          java: false,
          python: false
        });
      }
    });

    return () => unsub();
  }, []);

  const toggleLanguage = async (langKey) => {
    const newSettings = { ...languages, [langKey]: !languages[langKey] };
    await setDoc(doc(db, 'event_settings', 'languages'), newSettings, { merge: true });
  };

  const languageLabels = {
    c: 'C',
    cpp: 'C++',
    java: 'Java',
    python: 'Python'
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Settings2 size={32} />
        Language Settings
      </h1>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>
        Configure which programming languages are available for participants during the event. 
        Changes apply instantly across all active dashboards.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {Object.keys(languageLabels).map((langKey) => {
          const isEnabled = languages[langKey];
          return (
            <div 
              key={langKey}
              className="glass-panel" 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '2rem',
                border: isEnabled ? '2px solid var(--accent-success)' : '1px solid var(--glass-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ 
                  background: isEnabled ? 'rgba(0, 255, 0, 0.1)' : 'var(--bg-tertiary)', 
                  padding: '1rem', 
                  borderRadius: '50%',
                  color: isEnabled ? 'var(--accent-success)' : 'var(--text-secondary)'
                }}>
                  <Code2 size={32} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.8rem', color: isEnabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {languageLabels[langKey]}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                    {isEnabled ? 'Enabled and available for missions.' : 'Currently disabled.'}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => toggleLanguage(langKey)}
                className={isEnabled ? 'danger flex-center' : 'success flex-center'}
                style={{ padding: '1rem 2rem', fontSize: '1.1rem', minWidth: '160px' }}
              >
                {isEnabled ? (
                  <><PowerOff size={20} style={{ marginRight: '0.5rem' }} /> Disable</>
                ) : (
                  <><Power size={20} style={{ marginRight: '0.5rem' }} /> Enable</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
