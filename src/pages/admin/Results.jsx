import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import LoadingOverlay from '../../components/LoadingOverlay';
import { FileDown } from 'lucide-react';

export default function Results() {
  const [users, setUsers]      = useState([]);
  const [winners, setWinners]  = useState([]);
  const [loading, setLoading]  = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfLoading, setPdfLoading]   = useState(false);

  useEffect(() => {
    const fetchAndCalculate = async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      const qSnap = await getDocs(collection(db, 'users'));
      let allUsers = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      allUsers.sort((a, b) => {
        if ((b.totalPoints || 0) !== (a.totalPoints || 0)) return (b.totalPoints || 0) - (a.totalPoints || 0);
        if ((b.completedQuestions || 0) !== (a.completedQuestions || 0)) return (b.completedQuestions || 0) - (a.completedQuestions || 0);
        return (a.flags || 0) - (b.flags || 0);
      });

      setUsers(allUsers);
      setWinners(allUsers.slice(0, 3));
      setLoading(false);
    };
    fetchAndCalculate();
  }, []);

  const handleDownloadConfirm = async () => {
    setShowConfirm(false);
    setPdfLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // ─── Header ───────────────────────────────────────────────────────────────
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(0, 255, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CODATHAN 2K27 — FINAL RESULTS', 105, 13, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Ayya Nadar Janaki Ammal College  |  Dept. of Computer Application', 105, 22, { align: 'center' });

    // ─── Generated timestamp ──────────────────────────────────────────────────
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

    // ─── Winner badges ────────────────────────────────────────────────────────
    const medals = ['🥇 1ST PLACE', '🥈 2ND PLACE', '🥉 3RD PLACE'];
    const medalColors = [[200, 150, 0], [160, 160, 160], [160, 82, 45]];

    winners.forEach((w, i) => {
      const x = 14 + i * 62;
      const y = 42;
      doc.setFillColor(...medalColors[i]);
      doc.roundedRect(x, y, 58, 22, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(medals[i], x + 29, y + 7, { align: 'center' });
      doc.setFontSize(11);
      doc.text(w.id, x + 29, y + 14, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`${w.totalPoints || 0} pts`, x + 29, y + 20, { align: 'center' });
    });

    // ─── Full standings table (drawn manually — no plugin needed) ─────────────
    const cols   = [10, 25, 55, 110, 135, 155, 175]; // x positions
    const widths = [15, 30, 55,  25,  20,  20,  20]; // col widths
    const heads  = ['#', 'Lot No', 'Name', 'Points', 'Solved', 'Submits', 'Flags'];
    const ROW_H  = 8;
    const PAGE_H = 280;
    let y = 70;

    const drawRow = (cells, isHead, isAlt, isFlagged) => {
      // background
      if (isHead) {
        doc.setFillColor(0, 0, 0);
      } else if (isAlt) {
        doc.setFillColor(240, 255, 240);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(10, y, 190, ROW_H, 'F');

      // border
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.rect(10, y, 190, ROW_H, 'S');

      // text
      cells.forEach((cell, ci) => {
        const cellStr = String(cell);
        if (isHead) {
          doc.setTextColor(0, 220, 0);
          doc.setFont('helvetica', 'bold');
        } else if (ci === 3) {
          doc.setTextColor(0, 130, 0);
          doc.setFont('helvetica', 'bold');
        } else if (ci === 6 && isFlagged) {
          doc.setTextColor(200, 0, 0);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(30, 30, 30);
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(8);
        // center numeric cols, left-align text
        const cx = ci >= 3 ? cols[ci] + widths[ci] / 2 : cols[ci] + 1;
        const align = ci >= 3 ? 'center' : 'left';
        doc.text(cellStr, cx, y + 5.5, { align });
      });
      y += ROW_H;
    };

    // header row
    drawRow(heads, true, false, false);

    // data rows
    users.forEach((user, idx) => {
      if (y + ROW_H > PAGE_H) {
        // add page footer then new page
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}  —  CODATHAN 2K27`, 105, 290, { align: 'center' });
        doc.addPage();
        y = 15;
        drawRow(heads, true, false, false); // repeat header on new page
      }
      drawRow(
        [idx + 1, user.id, user.name || '-', user.totalPoints || 0,
         user.completedQuestions || 0, user.totalSubmissions || 0, user.flags || 0],
        false,
        idx % 2 === 1,
        (user.flags || 0) > 0
      );
    });

    // ─── Footer on all pages ──────────────────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}  —  CODATHAN 2K27`, 105, 290, { align: 'center' });
    }

    doc.save(`codathan_2k27_results_${Date.now()}.pdf`);
    setPdfLoading(false);
  };

  return (
    <div>
      {(loading || pdfLoading) && (
        <LoadingOverlay message={pdfLoading ? 'Generating PDF Report...' : 'Calculating Final Standings...'} />
      )}

      {/* PDF Confirmation Popup */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 2000,
        }}>
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', minWidth: '360px', border: '1px solid var(--accent-primary)' }}>
            <FileDown size={48} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Download PDF Report?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              This will generate and download the final leaderboard standings as a formatted PDF document.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="success" onClick={handleDownloadConfirm}>
                <FileDown size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Yes, Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2>Final Results &amp; Winners</h2>
        <button className="primary" onClick={() => setShowConfirm(true)}>
          <FileDown size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Download PDF Report
        </button>
      </div>

      {/* Top 3 Winners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {winners.map((winner, idx) => (
          <div key={winner.id} className="glass-panel flex-center" style={{
            padding: '2rem', flexDirection: 'column', textAlign: 'center',
            border: idx === 0 ? '2px solid var(--accent-warning)' : '1px solid var(--glass-border)',
          }}>
            <h1 style={{ color: idx === 0 ? 'var(--accent-warning)' : idx === 1 ? '#e2e8f0' : '#b45309', fontSize: '3rem', margin: 0 }}>
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
            </h1>
            <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--accent-primary)' }}>{winner.id}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{winner.name || '-'}</p>
            <div style={{ marginTop: '1rem', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', border: '1px solid var(--glass-border)', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
              {winner.totalPoints || 0} Points
            </div>
          </div>
        ))}
        {winners.length === 0 && !loading && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No results yet. Event data will appear here once participants complete questions.
          </div>
        )}
      </div>

      {/* Full Standings Table */}
      <h3 style={{ marginBottom: '1rem' }}>Full Standings</h3>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem' }}>Rank</th>
              <th style={{ padding: '1rem' }}>Lot No</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Points</th>
              <th style={{ padding: '1rem' }}>Solved</th>
              <th style={{ padding: '1rem' }}>Submissions</th>
              <th style={{ padding: '1rem' }}>Flags</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)', background: idx < 3 ? 'rgba(0,255,0,0.03)' : 'transparent' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: idx === 0 ? 'var(--accent-warning)' : 'inherit' }}>{idx + 1}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{user.id}</td>
                <td style={{ padding: '1rem' }}>{user.name || '-'}</td>
                <td style={{ padding: '1rem', color: 'var(--accent-success)', fontWeight: 'bold' }}>{user.totalPoints || 0}</td>
                <td style={{ padding: '1rem' }}>{user.completedQuestions || 0}</td>
                <td style={{ padding: '1rem' }}>{user.totalSubmissions || 0}</td>
                <td style={{ padding: '1rem', color: user.flags > 0 ? 'var(--accent-danger)' : 'inherit', fontWeight: user.flags > 0 ? 'bold' : 'normal' }}>
                  {user.flags || 0}
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No user data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
