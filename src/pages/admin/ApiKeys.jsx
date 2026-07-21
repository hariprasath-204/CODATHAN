import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Key, Plus, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Trash2, Power, ShieldCheck, Activity, Terminal } from 'lucide-react';
import { seedAndFetchKeys, INITIAL_JDOODLE_KEYS } from '../../services/jdoodlePool';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'EXHAUSTED', 'DISABLED'
  
  // New Key Form
  const [newClientId, setNewClientId] = useState('');
  const [newClientSecret, setNewClientSecret] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    seedAndFetchKeys().then(() => {
      const unsub = onSnapshot(collection(db, 'jdoodle_keys'), (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const keyOrderMap = new Map();
        INITIAL_JDOODLE_KEYS.forEach((k, idx) => {
          keyOrderMap.set(k.clientId, idx);
        });

        fetched.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          const orderA = keyOrderMap.has(a.clientId) ? keyOrderMap.get(a.clientId) : 999;
          const orderB = keyOrderMap.has(b.clientId) ? keyOrderMap.get(b.clientId) : 999;
          return orderA - orderB;
        });

        setKeys(fetched);
        setLoading(false);
      });

      return () => unsub();
    }).catch(err => {
      console.error("Error setting up JDoodle keys monitoring:", err);
      setLoading(false);
    });
  }, []);

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (!newClientId.trim() || !newClientSecret.trim()) {
      alert('Please enter both Client ID and Client Secret.');
      return;
    }
    setAdding(true);
    try {
      const cleanId = newClientId.trim();
      const cleanSecret = newClientSecret.trim();
      const labelToUse = newLabel.trim() || `Key #${keys.length + 1}`;

      await setDoc(doc(db, 'jdoodle_keys', cleanId), {
        clientId: cleanId,
        clientSecret: cleanSecret,
        status: 'active',
        usedCount: 0,
        dailyLimit: 22,
        label: labelToUse,
        createdAt: new Date()
      });

      setNewClientId('');
      setNewClientSecret('');
      setNewLabel('');
      alert('✅ New Java JDoodle API key added successfully and is now active!');
    } catch (err) {
      console.error('Failed to add key:', err);
      alert(`Error adding key: ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleStatus = async (keyObj) => {
    const nextStatus = keyObj.status === 'active' ? 'disabled' : 'active';
    await updateDoc(doc(db, 'jdoodle_keys', keyObj.id), {
      status: nextStatus
    });
  };

  const handleResetQuota = async (keyObj) => {
    await updateDoc(doc(db, 'jdoodle_keys', keyObj.id), {
      usedCount: 0,
      status: 'active'
    });
  };

  const handleDeleteKey = async (keyObj) => {
    if (!window.confirm(`Are you sure you want to delete "${keyObj.label || keyObj.clientId}"?`)) return;
    await deleteDoc(doc(db, 'jdoodle_keys', keyObj.id));
  };

  const handleResyncPool = async () => {
    setSeeding(true);
    await seedAndFetchKeys();
    setSeeding(false);
    alert('✅ Pool resynced cleanly.');
  };

  // Stats calculation
  const totalCount = keys.length;
  const activeCount = keys.filter(k => k.status === 'active' && (k.usedCount || 0) < 22).length;
  const exhaustedCount = keys.filter(k => k.status === 'exhausted' || (k.usedCount || 0) >= 22).length;
  const disabledCount = keys.filter(k => k.status === 'disabled').length;
  const totalUsed = keys.reduce((acc, k) => acc + (k.usedCount || 0), 0);
  const totalCapacity = totalCount * 22;

  const filteredKeys = keys.filter(k => {
    if (filter === 'ACTIVE') return k.status === 'active' && (k.usedCount || 0) < 22;
    if (filter === 'EXHAUSTED') return k.status === 'exhausted' || (k.usedCount || 0) >= 22;
    if (filter === 'DISABLED') return k.status === 'disabled';
    return true;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem', fontFamily: 'var(--font-mono)' }}>
      
      {/* Header Bar */}
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0, fontSize: '2.2rem', color: '#fff' }}>
            <Key size={28} color="var(--accent-primary)" />
            JAVA COMPILER API MANAGEMENT
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.4rem 0 0 0', fontSize: '0.95rem' }}>
            Live failover pool for JDoodle Java execution (`22 limit/day`). Auto-retries next key on limit hit.
          </p>
        </div>

        <button 
          onClick={handleResyncPool} 
          disabled={seeding}
          className="secondary flex-center"
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <RefreshCw size={15} className={seeding ? 'spin' : ''} />
          {seeding ? 'RESYNCING...' : 'RESYNC DEFAULT KEYS'}
        </button>
      </div>

      {/* Stats Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '2.5rem' }}>
        
        <div style={{ background: '#0d0d0d', border: '1px solid #222', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', letterSpacing: '1px' }}>TOTAL API POOL</span>
            <Terminal size={18} color="rgba(255,255,255,0.4)" />
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#fff' }}>{totalCount}</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Capacity: {totalCapacity} calls/day</span>
        </div>

        <div style={{ background: '#0d0d0d', border: '1px solid rgba(0, 255, 0, 0.4)', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#00ff00', fontSize: '0.8rem', letterSpacing: '1px' }}>ACTIVE & READY</span>
            <CheckCircle2 size={18} color="#00ff00" />
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#00ff00' }}>{activeCount}</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(0, 255, 0, 0.7)' }}>Available right now</span>
        </div>

        <div style={{ background: '#0d0d0d', border: '1px solid rgba(255, 0, 85, 0.4)', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ff0055', fontSize: '0.8rem', letterSpacing: '1px' }}>QUOTA FINISHED</span>
            <AlertTriangle size={18} color="#ff0055" />
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ff0055' }}>{exhaustedCount}</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 0, 85, 0.7)' }}>Exceeded 22 calls</span>
        </div>

        <div style={{ background: '#0d0d0d', border: '1px solid #333', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', letterSpacing: '1px' }}>NON-ACTIVE</span>
            <XCircle size={18} color="rgba(255,255,255,0.4)" />
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>{disabledCount}</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Disabled manually</span>
        </div>

        <div style={{ background: '#0d0d0d', border: '1px solid rgba(0, 210, 255, 0.4)', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#00d2ff', fontSize: '0.8rem', letterSpacing: '1px' }}>TODAY'S USAGE</span>
            <Activity size={18} color="#00d2ff" />
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#00d2ff' }}>{totalUsed}</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(0, 210, 255, 0.7)' }}>{totalCount ? Math.round((totalUsed / totalCapacity) * 100) : 0}% total quota used</span>
        </div>
      </div>

      {/* Add New API Key Bar */}
      <div style={{ background: '#0a0a0a', border: '1px solid #222', padding: '1.5rem', marginBottom: '2.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', color: '#fff', letterSpacing: '1px' }}>
          <Plus size={18} color="var(--accent-primary)" /> ADD NEW JDOODLE API KEY
        </h3>
        <form onSubmit={handleAddKey} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
              CLIENT ID *
            </label>
            <input
              type="text"
              placeholder="e.g. 4a9a6038b2a7e33b9a..."
              value={newClientId}
              onChange={e => setNewClientId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.6rem 0.8rem', background: '#141414', border: '1px solid #333', color: '#fff', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
              CLIENT SECRET *
            </label>
            <input
              type="text"
              placeholder="e.g. af69762f1a3185158b..."
              value={newClientSecret}
              onChange={e => setNewClientSecret(e.target.value)}
              required
              style={{ width: '100%', padding: '0.6rem 0.8rem', background: '#141414', border: '1px solid #333', color: '#fff', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
              KEY LABEL (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. Backup Key #55"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', background: '#141414', border: '1px solid #333', color: '#fff', fontSize: '0.9rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={adding}
            className="primary"
            style={{ padding: '0.6rem 1.2rem', height: '40px', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            {adding ? 'ADDING...' : '+ ADD API KEY'}
          </button>
        </form>
      </div>

      {/* Filter Tabs Header */}
      <div className="flex-between" style={{ marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>
          API KEYS DIRECTORY <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>({filteredKeys.length})</span>
        </h3>
        
        <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #222', padding: '4px', gap: '6px' }}>
          {[
            { id: 'ALL', label: `ALL KEYS (${totalCount})` },
            { id: 'ACTIVE', label: `ACTIVE (${activeCount})` },
            { id: 'EXHAUSTED', label: `FINISHED (${exhaustedCount})` },
            { id: 'DISABLED', label: `NON-ACTIVE (${disabledCount})` },
          ].map(tab => {
            const isSelected = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '0.5rem 1rem',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  background: isSelected ? 'rgba(0, 255, 0, 0.15)' : 'transparent',
                  color: isSelected ? '#00ff00' : 'rgba(255,255,255,0.6)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clean, Non-Wrapping Table */}
      <div style={{ background: '#0d0d0d', border: '1px solid #222', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
          <thead>
            <tr style={{ background: '#141414', borderBottom: '1px solid #2a2a2a', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', letterSpacing: '1px' }}>
              <th style={{ padding: '1rem 1.2rem', width: '60px', whiteSpace: 'nowrap' }}>#</th>
              <th style={{ padding: '1rem 1.2rem', whiteSpace: 'nowrap' }}>LABEL & CLIENT ID</th>
              <th style={{ padding: '1rem 1.2rem', width: '130px', whiteSpace: 'nowrap' }}>STATUS</th>
              <th style={{ padding: '1rem 1.2rem', width: '160px', whiteSpace: 'nowrap' }}>QUOTA (22 MAX)</th>
              <th style={{ padding: '1rem 1.2rem', width: '220px', whiteSpace: 'nowrap' }}>PROGRESS</th>
              <th style={{ padding: '1rem 1.2rem', width: '240px', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.map((keyObj, idx) => {
              const used = keyObj.usedCount || 0;
              const isExhausted = keyObj.status === 'exhausted' || used >= 22;
              const isDisabled = keyObj.status === 'disabled';
              const progressPct = Math.min(100, Math.round((used / 22) * 100));

              let badgeText = 'ACTIVE';
              let badgeColor = '#00ff00';
              let badgeBg = 'rgba(0, 255, 0, 0.1)';
              let badgeBorder = '#00ff00';

              if (isDisabled) {
                badgeText = 'DISABLED';
                badgeColor = 'rgba(255,255,255,0.5)';
                badgeBg = 'rgba(255,255,255,0.05)';
                badgeBorder = '#444';
              } else if (isExhausted) {
                badgeText = 'FINISHED';
                badgeColor = '#ff0055';
                badgeBg = 'rgba(255, 0, 85, 0.1)';
                badgeBorder = '#ff0055';
              }

              return (
                <tr key={keyObj.id} style={{ borderBottom: '1px solid #1a1a1a', transition: 'background 0.2s', background: idx % 2 === 0 ? '#0d0d0d' : '#101010' }}>
                  
                  <td style={{ padding: '1.1rem 1.2rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {idx + 1}
                  </td>
                  
                  <td style={{ padding: '1.1rem 1.2rem', whiteSpace: 'nowrap' }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>{keyObj.label || `Key #${idx + 1}`}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '3px' }}>
                      {keyObj.clientId}
                    </div>
                  </td>
                  
                  <td style={{ padding: '1.1rem 1.2rem', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.3rem 0.7rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeBorder}`,
                      letterSpacing: '1px',
                      whiteSpace: 'nowrap'
                    }}>
                      {badgeText}
                    </span>
                  </td>
                  
                  <td style={{ padding: '1.1rem 1.2rem', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span style={{ color: isExhausted ? '#ff0055' : '#fff' }}>{used}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}> / 22</span>
                  </td>
                  
                  <td style={{ padding: '1.1rem 1.2rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flexGrow: 1, height: '8px', background: '#1c1c1c', border: '1px solid #333', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: isExhausted ? '#ff0055' : progressPct > 75 ? '#ffaa00' : '#00ff00',
                          boxShadow: isExhausted ? '0 0 8px #ff0055' : progressPct > 0 ? '0 0 8px rgba(0,255,0,0.5)' : 'none',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', minWidth: '32px', textAlign: 'right' }}>
                        {progressPct}%
                      </span>
                    </div>
                  </td>
                  
                  <td style={{ padding: '1.1rem 1.2rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      
                      {/* Toggle Enable/Disable Button */}
                      <button
                        onClick={() => handleToggleStatus(keyObj)}
                        style={{
                          background: 'transparent',
                          border: keyObj.status === 'active' ? '1px solid #ff0055' : '1px solid #00ff00',
                          color: keyObj.status === 'active' ? '#ff0055' : '#00ff00',
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Power size={13} />
                        {keyObj.status === 'active' ? 'DISABLE' : 'ENABLE'}
                      </button>

                      {/* Reset Quota Button */}
                      <button
                        onClick={() => handleResetQuota(keyObj)}
                        title="Reset Daily Limit to 0"
                        style={{
                          background: '#141414',
                          border: '1px solid #333',
                          color: '#fff',
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <RefreshCw size={13} />
                        RESET
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteKey(keyObj)}
                        title="Delete API Key"
                        style={{
                          background: 'transparent',
                          border: '1px solid #333',
                          color: 'rgba(255,255,255,0.4)',
                          padding: '0.4rem 0.6rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>

                    </div>
                  </td>

                </tr>
              );
            })}
            {filteredKeys.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  No API keys found in this tab.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
