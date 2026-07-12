import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LoadingOverlay from '../../components/LoadingOverlay';
import { FileDown, Trophy, FileSpreadsheet } from 'lucide-react';

export default function Results() {
  const [users, setUsers]      = useState([]);
  const [winners, setWinners]  = useState([]);
  const [loading, setLoading]  = useState(false);
  const [showModal, setShowModal] = useState(false);
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

  // Load image from URL to Base64
  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Could not load logo:', url, e);
      return null;
    }
  };

  // Shared institutional header identical to demopdf with left & right logos
  const drawCollegeHeader = async (doc, sheetTitle) => {
    const collegeLogo = await loadImageAsBase64('/college_logo.png');
    const deptLogo = await loadImageAsBase64('/dept_logo.png');

    if (collegeLogo) {
      try { doc.addImage(collegeLogo, 'PNG', 14, 11, 20, 21); } catch (e) {}
    }
    if (deptLogo) {
      try { doc.addImage(deptLogo, 'PNG', 176, 11, 20, 21); } catch (e) {}
    }

    doc.setTextColor(0, 0, 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SOFTECH', 105, 14, { align: 'center' });

    doc.setFontSize(10.5);
    doc.text('DEPARTMENT OF COMPUTER APPLICATIONS', 105, 20, { align: 'center' });

    doc.setFontSize(12.5);
    doc.text('AYYA NADAR JANAKI AMMAL COLLEGE', 105, 26, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(
      "(Autonomous, Affiliated to Madurai Kamaraj University, Madurai, Re-accredited (4th Cycle) with 'A+' Grade",
      105, 31, { align: 'center' }
    );
    doc.text(
      "(CGPA 3.48 out of 4) by NAAC, Recognized as College of Excellence and Mentor Institution by UGC, STAR College by DBT",
      105, 35, { align: 'center' }
    );
    doc.text(
      "and Ranked 72nd at National Level in NIRF 2025 and DST-FIST (2023) Supported & An ISO 9001:2015 & ISO 21001:2018 Certified Institution)",
      105, 39, { align: 'center' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SIVAKASI - 626 124.', 105, 44, { align: 'center' });

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    doc.line(14, 47, 196, 47);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('CODATHAN 2K27 Coding Event', 105, 54, { align: 'center' });

    doc.setFontSize(13);
    doc.text(sheetTitle, 105, 61, { align: 'center' });

    return 68;
  };

  const drawStaffSignatures = async (doc) => {
    let judges = [];
    try {
      const { query, orderBy } = await import('firebase/firestore');
      const qSnap = await getDocs(query(collection(db, 'judge_signatures'), orderBy('createdAt', 'asc')));
      judges = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('Could not fetch judge signatures:', err);
    }

    let currentY = (doc.lastAutoTable?.finalY || 180) + 10;

    if (judges.length === 0) {
      if (currentY > 270) {
        doc.addPage();
        currentY = 35;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Staff Signature', 185, currentY + 15, { align: 'right' });
      return;
    }

    // Render each judge signature image one by one on right side bottom with decreased height and compact 1.5 line space
    for (const judge of judges) {
      if (currentY + 15 > 280) {
        doc.addPage();
        currentY = 25;
      }

      if (judge.signatureBase64) {
        try {
          doc.addImage(judge.signatureBase64, 'PNG', 150, currentY, 36, 10);
        } catch (imgErr) {
          console.warn('Signature image embed warning:', imgErr);
        }
      }
      currentY += 15; // Decreased compact 1.5 line spacing advance after image
    }
  };

  // 1. Top 3 Winners PDF
  const generateWinnerSheetPDF = async () => {
    setShowModal(false);
    setPdfLoading(true);
    await new Promise(r => setTimeout(r, 400));

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = await drawCollegeHeader(doc, 'Top 3 Winners (CODATHAN 2K27)');

    const head = [['Rank', 'Participant Roll / Lot No', 'Participant Name', 'Solved Questions', 'Total Points']];
    const body = winners.map((w, idx) => [
      idx === 0 ? '1 (FIRST)' : idx === 1 ? '2 (SECOND)' : '3 (THIRD)',
      w.id || '-',
      w.name || '-',
      String(w.completedQuestions || 0),
      String(w.totalPoints || 0),
    ]);

    autoTable(doc, {
      startY,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: 20, halign: 'center', fontSize: 10 },
      columnStyles: {
        2: { halign: 'left' },
      },
      margin: { left: 14, right: 14 },
    });

    await drawStaffSignatures(doc);
    doc.save(`CODATHAN_2K27_Top3_Winners.pdf`);
    setPdfLoading(false);
  };

  // 2. Complete ScoreSheet PDF
  const generateScoreSheetPDF = async () => {
    setShowModal(false);
    setPdfLoading(true);
    await new Promise(r => setTimeout(r, 400));

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = await drawCollegeHeader(doc, 'CODATHAN 2K27 ScoreSheet');

    const head = [['Rank', 'Participant Roll / Lot No', 'Participant Name', 'Solved', 'Submissions', 'Flags', 'Total Points']];
    const body = users.map((u, idx) => [
      String(idx + 1),
      u.id || '-',
      u.name || '-',
      String(u.completedQuestions || 0),
      String(u.totalSubmissions || 0),
      String(u.flags || 0),
      String(u.totalPoints || 0),
    ]);

    autoTable(doc, {
      startY,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: 20, halign: 'center', fontSize: 9 },
      columnStyles: {
        2: { halign: 'left' },
      },
      margin: { left: 14, right: 14 },
    });

    await drawStaffSignatures(doc);
    doc.save(`CODATHAN_2K27_ScoreSheet.pdf`);
    setPdfLoading(false);
  };

  return (
    <div>
      {(loading || pdfLoading) && (
        <LoadingOverlay message={pdfLoading ? 'Generating PDF Document...' : 'Calculating Final Standings...'} />
      )}

      {/* PDF Selection Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 2000,
        }}>
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', minWidth: '420px', border: '1px solid var(--accent-primary)' }}>
            <FileDown size={48} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Select Official PDF Format</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Choose between downloading the Top 3 Winners Sheet or the full Participant ScoreSheet. Both include the official college header and staff signature block.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9rem' }} onClick={generateWinnerSheetPDF}>
                <Trophy size={18} />
                Download Top 3 Winners Sheet PDF
              </button>
              <button className="success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9rem' }} onClick={generateScoreSheetPDF}>
                <FileSpreadsheet size={18} />
                Download Complete ScoreSheet PDF
              </button>
              <button className="secondary" style={{ marginTop: '0.5rem' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2>Final Results &amp; Winners</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="primary" onClick={generateWinnerSheetPDF}>
            <Trophy size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Winner Sheet PDF
          </button>
          <button className="success" onClick={generateScoreSheetPDF}>
            <FileSpreadsheet size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Full ScoreSheet PDF
          </button>
        </div>
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
