import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Key, Plus, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Trash2, Power, ShieldCheck, Activity } from 'lucide-react';
import { seedAndFetchKeys } from '../../services/jdoodlePool';

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
    // Initial seed check if empty
    seedAndFetchKeys().then(() => {
      // Real-time listener on jdoodle_keys
      const unsub = onSnapshot(collection(db, 'jdoodle_keys'), (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort: active first, then lowest used count
        fetched.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return (a.usedCount || 0) - (b.usedCount || 0);
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
      const labelToUse = newLabel.trim() || `Custom Key #${keys.length + 1}`;

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
    alert('✅ Pool resynced with default 29 JDoodle keys.');
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0 }}>
            <Key size={32} />
            Java JDoodle API Key Pool
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0 0', fontSize: '1rem' }}>
            Automatic failover pool for Java execution (`22 executions/day` limit per key).
          </p>
        </div>

        <button 
          onClick={handleResyncPool} 
          disabled={seeding}
          className="flex-center"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            padding: '0.7rem 1.2rem',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <RefreshCw size={16} className={seeding ? 'spin' : ''} />
          {seeding ? 'Resyncing...' : 'Resync Default 29 Keys'}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '2.5rem' }}>
        
        {/* Total API Keys */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>TOTAL API KEYS</span>
            <Key size={20} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontSize: '2.4rem', margin: '0.5rem 0', color: 'var(--text-primary)' }}>{totalCount}</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Capacity: {totalCapacity} runs/day</span>
        </div>

        {/* Active API Keys */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #00f59b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>ACTIVE API KEYS</span>
            <CheckCircle2 size={20} color="#00f59b" />
          </div>
          <h2 style={{ fontSize: '2.4rem', margin: '0.5rem 0', color: '#00f59b' }}>{activeCount}</h2>
          <span style={{ fontSize: '0.85rem', color: '#00f59b' }}>Ready for execution</span>
        </div>

        {/* Finished / Exhausted */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #ff0055' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>FINISHED LIMIT</span>
            <AlertTriangle size={20} color="#ff0055" />
          </div>
          <h2 style={{ fontSize: '2.4rem', margin: '0.5rem 0', color: '#ff0055' }}>{exhaustedCount}</h2>
          <span style={{ fontSize: '0.85rem', color: '#ff0055' }}>Exceeded 22 quota today</span>
        </div>

        {/* Non-Active / Disabled */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>NON-ACTIVE</span>
            <XCircle size={20} color="var(--text-secondary)" />
          </div>
          <h2 style={{ fontSize: '2.4rem', margin: '0.5rem 0', color: 'var(--text-secondary)' }}>{disabledCount}</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manually turned off</span>
        </div>

        {/* Total Quota Usage Today */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #00d2ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>TODAY'S USAGE</span>
            <Activity size={20} color="#00d2ff" />
          </div>
          <h2 style={{ fontSize: '2.4rem', margin: '0.5rem 0', color: '#00d2ff' }}>{totalUsed}</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{totalCount ? Math.round((totalUsed / totalCapacity) * 100) : 0}% of daily pool</span>
        </div>
      </div>

      {/* Add Another API Key Card */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem', border: '1px solid var(--glass-border)' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
          <Plus size={20} /> Add Another JDoodle API Key
        </h3>
        <form onSubmit={handleAddKey} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 'bold' }}>
              Client ID *
            </label>
            <input
              type="text"
              placeholder="e.g., 4a9a6038b2a7e33b9a6b..."
              value={newClientId}
              onChange={e => setNewClientId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: '#fff', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 'bold' }}>
              Client Secret *
            </label>
            <input
              type="text"
              placeholder="e.g., af69762f1a3185158b2feb..."
              value={newClientSecret}
              onChange={e => setNewClientSecret(e.target.value)}
              required
              style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: '#fff', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 'bold' }}>
              Key Label / Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Backup Key #30"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: '#fff' }}
            />
          </div>

          <button
            type="submit"
            disabled={adding}
            className="primary flex-center"
            style={{ padding: '0.7rem 1.5rem', height: '42px', fontWeight: 'bold' }}
          >
            <Plus size={18} style={{ marginRight: '0.4rem' }} />
            {adding ? 'Adding...' : 'Add API Key'}
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>API Keys Directory ({filteredKeys.length})</h3>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--glass-border)', gap: '4px' }}>
          {[
            { id: 'ALL', label: `All Keys (${totalCount})` },
            { id: 'ACTIVE', label: `Active (${activeCount})` },
            { id: 'EXHAUSTED', label: `Finished (${exhaustedCount})` },
            { id: 'DISABLED', label: `Non-Active (${disabledCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: filter === tab.id ? 'var(--accent-primary)' : 'transparent',
                color: filter === tab.id ? '#000' : 'var(--text-secondary)',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* API Keys Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem' }}>#</th>
              <th style={{ padding: '1rem' }}>Label / Client ID</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Daily Quota (22 Max)</th>
              <th style={{ padding: '1rem' }}>Progress</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.map((keyObj, idx) => {
              const used = keyObj.usedCount || 0;
              const isExhausted = keyObj.status === 'exhausted' || used >= 22;
              const isActive = keyObj.status === 'active' && !isExhausted;
              const isDisabled = keyObj.status === 'disabled';
              const progressPct = Math.min(100, Math.round((used / 22) * 100));

              let statusColor = '#00f59b';
              let statusText = 'Active API';
              let statusBg = 'rgba(0, 245, 155, 0.15)';

              if (isDisabled) {
                statusColor = 'var(--text-secondary)';
                statusText = 'Non-Active (Disabled)';
                statusBg = 'rgba(255, 255, 255, 0.08)';
              } else if (isExhausted) {
                statusColor = '#ff0055';
                statusText = 'Finished Limit';
                statusBg = 'rgba(255, 0, 85, 0.15)';
              }

              return (
                <tr key={keyObj.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{keyObj.label || `Key #${idx + 1}`}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {keyObj.clientId}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.7rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      background: statusBg,
                      color: statusColor,
                      border: `1px solid ${statusColor}`
                    }}>
                      {statusText}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    <span style={{ color: isExhausted ? '#ff0055' : 'var(--text-primary)' }}>{used}</span> / 22 executions
                  </td>
                  <td style={{ padding: '1rem', width: '20%' }}>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        background: isExhausted ? '#ff0055' : progressPct > 75 ? '#ffaa00' : '#00f59b',
                        transition: 'width 0.3s'
                      }}></div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {/* Toggle Active / Non-Active */}
                      <button
                        onClick={() => handleToggleStatus(keyObj)}
                        title={keyObj.status === 'active' ? 'Turn Non-Active' : 'Turn Active'}
                        style={{
                          background: keyObj.status === 'active' ? 'rgba(255, 0, 85, 0.1)' : 'rgba(0, 245, 155, 0.1)',
                          border: `1px solid ${keyObj.status === 'active' ? '#ff0055' : '#00f59b'}`,
                          color: keyObj.status === 'active' ? '#ff0055' : '#00f59b',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                      >
                        <Power size={14} />
                        {keyObj.status === 'active' ? 'Disable' : 'Enable'}
                      </button>

                      {/* Reset Quota Counter */}
                      <button
                        onClick={() => handleResetQuota(keyObj)}
                        title="Reset Daily Counter (0 / 22)"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem'
                        }}
                      >
                        <RefreshCw size={14} />
                        Reset Limit
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteKey(keyObj)}
                        title="Delete API Key"
                        style={{
                          background: 'transparent',
                          border: '1px solid transparent',
                          color: 'var(--text-secondary)',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredKeys.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No API keys found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
