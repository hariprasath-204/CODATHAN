import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { PenTool, Upload, Trash2, CheckCircle2, UserCheck, Image as ImageIcon } from 'lucide-react';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function JudgeSigns() {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('Staff / Judge Coordinator');
  const [previewImage, setPreviewImage] = useState(null);
  const [mode, setMode] = useState('upload'); // 'upload' or 'draw'
  const [saving, setSaving] = useState(false);

  // Canvas for drawing signature
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchJudges();
  }, []);

  const fetchJudges = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'judge_signatures'), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      setJudges(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching judge signatures:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setPreviewImage(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setPreviewImage(null);
    }
  };

  const handleSaveJudge = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter the staff/judge name.');
      return;
    }
    if (!previewImage) {
      alert('Please provide an e-signature (upload an image or draw one).');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'judge_signatures'), {
        name: name.trim(),
        designation: designation.trim(),
        signatureBase64: previewImage,
        createdAt: new Date(),
      });
      setName('');
      setPreviewImage(null);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      await fetchJudges();
    } catch (err) {
      console.error('Failed to save judge signature:', err);
      alert('Error saving signature: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJudge = async (id) => {
    if (!window.confirm('Remove this staff/judge signature?')) return;
    try {
      await deleteDoc(doc(db, 'judge_signatures', id));
      setJudges(judges.filter(j => j.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div>
      {saving && <LoadingOverlay message="Saving Judge E-Signature..." />}

      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h2>Staff &amp; Judge E-Signatures</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
            Upload or draw staff e-signatures. These signatures will automatically appear at the bottom-right of official PDF reports one by one with 1.5 line spacing.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Form section */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} color="var(--accent-primary)" />
            Add Staff / Judge Signature
          </h3>

          <form onSubmit={handleSaveJudge}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Staff / Judge Full Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. S. MAHESWARAN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Designation / Role</label>
              <input
                type="text"
                placeholder="e.g. Staff Coordinator / Judge"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>E-Signature Method</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={mode === 'upload' ? 'primary' : 'secondary'}
                  style={{ flex: 1, padding: '0.6rem' }}
                  onClick={() => setMode('upload')}
                >
                  <Upload size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  Upload Image
                </button>
                <button
                  type="button"
                  className={mode === 'draw' ? 'primary' : 'secondary'}
                  style={{ flex: 1, padding: '0.6rem' }}
                  onClick={() => setMode('draw')}
                >
                  <PenTool size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  Draw Signature
                </button>
              </div>

              {mode === 'upload' ? (
                <div style={{ border: '2px dashed var(--glass-border)', padding: '1.5rem', textAlign: 'center', borderRadius: '8px' }}>
                  <input type="file" accept="image/*" onChange={handleFileChange} id="sign-upload" style={{ display: 'none' }} />
                  <label htmlFor="sign-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    <ImageIcon size={32} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 'bold' }}>Click to select E-Signature image (PNG/JPG)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Transparent PNG recommended</div>
                  </label>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.5rem', background: '#ffffff' }}>
                  <canvas
                    ref={canvasRef}
                    width={340}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ cursor: 'crosshair', display: 'block', width: '100%', borderRadius: '4px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="button" className="secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={clearCanvas}>
                      Clear Drawing
                    </button>
                  </div>
                </div>
              )}
            </div>

            {previewImage && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>E-Signature Preview:</div>
                <div style={{ background: '#ffffff', padding: '0.8rem', borderRadius: '6px', display: 'inline-block' }}>
                  <img src={previewImage} alt="Signature preview" style={{ maxHeight: '70px', display: 'block' }} />
                </div>
              </div>
            )}

            <button type="submit" className="success" style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>
              <CheckCircle2 size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Save Staff / Judge Signature
            </button>
          </form>
        </div>

        {/* List of saved judges */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Active Staff / Judge Signatures ({judges.length})</h3>

          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading signatures...</p>
          ) : judges.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No judge signatures added yet. Upload or draw staff signatures on the left.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {judges.map((j) => (
                <div
                  key={j.id}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#ffffff', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                      <img
                        src={j.signatureBase64}
                        alt={j.name}
                        style={{ height: '40px', maxWidth: '120px', objectFit: 'contain' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{j.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{j.designation}</div>
                    </div>
                  </div>

                  <button
                    className="secondary"
                    onClick={() => handleDeleteJudge(j.id)}
                    style={{ padding: '0.5rem', color: 'var(--accent-danger)' }}
                    title="Remove Signature"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
