import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, getDocs, getDoc, doc, setDoc, addDoc, updateDoc, increment, onSnapshot, where } from 'firebase/firestore';
import Editor from '@monaco-editor/react';
import { executeCode, resetCompiler } from '../../services/compiler';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Check, AlertTriangle, Monitor, LogOut, Loader2, Code2, ArrowLeft, Clock, Lock, UserCheck } from 'lucide-react';
import LoadingOverlay from '../../components/LoadingOverlay';
import { syncClock, getNow } from '../../utils/timeSync';
import { getStudentCategory } from '../../utils/ranking';

export default function EventDashboard() {
  const navigate = useNavigate();
  const [lotNo, setLotNo] = useState('');
  const [userCategory, setUserCategory] = useState(localStorage.getItem('codathan_user_category') || 'UG');
  
  const [eventData, setEventData] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [questions, setQuestions] = useState([]);
  
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [language, setLanguage] = useState('c++');
  const [enabledLanguages, setEnabledLanguages] = useState({ 'c++': true });

  // Default starter code templates
  const STARTER_CODE = {
    'c': `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}`,
    'c++': `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}`,
    'java': `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n        \n    }\n}`,
    'python': `def main():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    main()`
  };

  const [code, setCode] = useState(STARTER_CODE['c++']);
  const [output, setOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [checkingHidden, setCheckingHidden] = useState(false);
  
  const [showWelcome, setShowWelcome] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [roundFinished, setRoundFinished] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  
  const [endTime, setEndTime] = useState(null);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [passedQuestionIds, setPassedQuestionIds] = useState([]);
  const [loadingOverlayMsg, setLoadingOverlayMsg] = useState('Initializing Workspace...');
  const lastRunRef = useRef(0); // debounce: prevent rapid Wandbox calls

  useEffect(() => {
    const userLot = localStorage.getItem('codathan_user');
    if (!userLot) {
      navigate('/login');
      return;
    }
    setLotNo(userLot);
    syncClock(true);

    // Listen to user document for any category updates
    const unsubUser = onSnapshot(doc(db, 'users', userLot), (uSnap) => {
      if (uSnap.exists()) {
        const uData = uSnap.data();
        const cat = uData.category || getStudentCategory(uData);
        setUserCategory(cat);
        localStorage.setItem('codathan_user_category', cat);
      }
    });

    // 1. Listen to Global Event Settings
    const unsubEvent = onSnapshot(doc(db, 'event_settings', 'main'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventData(data);
        if (data.status === 'finished') {
          navigate('/waiting');
        } else if (data.status === 'active' && data.startTime && data.duration) {
          await syncClock(true);
          setEndTime(data.startTime.toDate().getTime() + (data.duration * 1000));
        } else {
          setEndTime(null);
        }
      }
    });

    // 2. Listen to Rounds Sequence
    const unsubRounds = onSnapshot(collection(db, 'rounds'), (snapshot) => {
      let r = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      r.sort((a, b) => (a.createdAt?.toDate().getTime() || 0) - (b.createdAt?.toDate().getTime() || 0));
      setRounds(r);
    });

    // 3. Fetch Questions
    const fetchQuestions = async () => {
      setLoadingOverlayMsg('Fetching Missions...');
      await new Promise(r => setTimeout(r, 800));
      const qSnap = await getDocs(collection(db, 'questions'));
      setQuestions(qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingOverlayMsg(null);
    };
    fetchQuestions();

    // 4. Listen to User's Passed Code
    const qCode = query(collection(db, 'user_code'), where('lotNo', '==', userLot), where('passed', '==', true));
    const unsubCode = onSnapshot(qCode, (snapshot) => {
      setPassedQuestionIds(snapshot.docs.map(doc => doc.data().questionId));
    });

    // Anti-cheat: Window Blur & Visibility Change
    let lastCheatTime = 0;
    const handleCheatDetection = () => {
      const now = Date.now();
      if (now - lastCheatTime < 3000) return; // Prevent spamming within 3 seconds
      lastCheatTime = now;

      // Fire and forget, don't await to avoid blocking when tab is backgrounded
      addDoc(collection(db, 'logs'), {
        lotNo: userLot,
        type: 'tab_switch',
        timestamp: new Date()
      });
      setDoc(doc(db, 'users', userLot), {
        flags: increment(1)
      }, { merge: true });
      
      // Use a custom event to trigger the warning modal
      window.dispatchEvent(new Event('show-cheat-warning'));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleCheatDetection();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleCheatDetection);

    // Listen for admin compiler reset signal
    const unsubReset = onSnapshot(doc(db, 'system_commands', 'compiler_reset'), (snap) => {
      if (snap.exists()) {
        resetCompiler();
        console.log('[EventDashboard] Compiler reset triggered by admin');
      }
    });

    // Listen to enabled languages
    const unsubLangs = onSnapshot(doc(db, 'event_settings', 'languages'), (snap) => {
      if (snap.exists()) {
        setEnabledLanguages(snap.data());
      }
    });

    setTimeout(() => setShowWelcome(false), 3000);

    return () => {
      unsubUser();
      unsubEvent();
      unsubRounds();
      unsubCode();
      unsubReset();
      unsubLangs();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleCheatDetection);
    };
  }, [navigate]);

  const [showCheatWarning, setShowCheatWarning] = useState(false);

  useEffect(() => {
    const onCheatWarning = () => setShowCheatWarning(true);
    window.addEventListener('show-cheat-warning', onCheatWarning);
    return () => window.removeEventListener('show-cheat-warning', onCheatWarning);
  }, []);

  // Timer interval using synchronized getNow()
  useEffect(() => {
    if (!endTime || eventData?.status !== 'active') return;
    
    const interval = setInterval(() => {
      const now = getNow();
      const diff = endTime - now;
      
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeftStr('00:00');
        setRoundFinished(true);
      } else {
        const totalSeconds = Math.floor(diff / 1000);
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        setTimeLeftStr(`${m}:${s}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, eventData, navigate]);

  // Filter rounds and questions for this user's category (UG vs PG or BOTH)
  const filteredRounds = rounds.filter(r => !r.category || r.category === 'BOTH' || r.category === userCategory);
  const filteredQuestions = questions.filter(q => (!q.category || q.category === 'BOTH' || q.category === userCategory) && filteredRounds.some(r => r.id === q.roundId));

  // Auto-finish Event if all questions across applicable rounds are done
  useEffect(() => {
    if (filteredQuestions.length > 0 && filteredRounds.length > 0) {
      const allPassed = filteredQuestions.every(q => passedQuestionIds.includes(q.id));
      if (allPassed && !roundFinished) {
        setRoundFinished(true);
      }
    }
  }, [filteredQuestions, filteredRounds, passedQuestionIds, roundFinished, navigate]);

  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    }
  };

  const handleCodeChange = (value) => {
    setCode(value);
    if (selectedQuestion && value !== undefined) {
      localStorage.setItem(`codathan_code_${lotNo}_${selectedQuestion.id}_${language}`, value);
      localStorage.setItem(`codathan_code_${lotNo}_${selectedQuestion.id}`, value);
      localStorage.setItem(`codathan_lang_${lotNo}_${selectedQuestion.id}`, language);
      setDoc(doc(db, 'user_code', `${lotNo}_${selectedQuestion.id}`), {
        lotNo,
        questionId: selectedQuestion.id,
        code: value,
        language,
        timestamp: new Date()
      }, { merge: true });
    }
  };

  const handleOpenQuestion = async (q) => {
    setSelectedQuestion(q);
    const savedLang = localStorage.getItem(`codathan_lang_${lotNo}_${q.id}`) || q.language || 'c++';
    setLanguage(savedLang);

    const localCodeSpecific = localStorage.getItem(`codathan_code_${lotNo}_${q.id}_${savedLang}`);
    const localCodeGeneral = localStorage.getItem(`codathan_code_${lotNo}_${q.id}`);
    const savedLocalCode = localCodeSpecific || localCodeGeneral;

    if (savedLocalCode) {
      setCode(savedLocalCode);
    } else {
      setCode(STARTER_CODE[savedLang] || STARTER_CODE['c++']);
    }

    setOutput('');
    setViewMode('editor');

    const localStartKey = `codathan_start_${lotNo}_${q.id}`;
    if (!localStorage.getItem(localStartKey)) {
      localStorage.setItem(localStartKey, Date.now().toString());
    }

    // Asynchronously fetch saved code from Firestore in case student worked on another device or cleared cache
    try {
      const snap = await getDoc(doc(db, 'user_code', `${lotNo}_${q.id}`));
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.code && !savedLocalCode) {
          setCode(data.code);
          if (data.language) setLanguage(data.language);
        }
        if (!data.startTime) {
          const st = new Date(parseInt(localStorage.getItem(localStartKey) || Date.now()));
          await setDoc(doc(db, 'user_code', `${lotNo}_${q.id}`), {
            lotNo,
            questionId: q.id,
            startTime: st
          }, { merge: true });
        }
      } else {
        const st = new Date(parseInt(localStorage.getItem(localStartKey) || Date.now()));
        await setDoc(doc(db, 'user_code', `${lotNo}_${q.id}`), {
          lotNo,
          questionId: q.id,
          startTime: st
        }, { merge: true });
      }
    } catch (err) {
      console.error('Error restoring saved question code or recording startTime:', err);
    }
  };

  const normalizeString = (str) => {
    if (!str) return '';
    return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  };

  const handleRun = async () => {
    if (!selectedQuestion) return;
    // Debounce: enforce 2s gap between API calls (Wandbox safe usage)
    const now = Date.now();
    if (now - lastRunRef.current < 2000) {
      setOutput('Please wait 2 seconds before running again...');
      return;
    }
    lastRunRef.current = now;
    setIsCompiling(true);
    setLoadingOverlayMsg('Compiling Code...');
    await new Promise(r => setTimeout(r, 500));
    setOutput('Compiling and running...');
    
    const result = await executeCode(code, language, selectedQuestion.visibleInput);
    
    if (result.success && normalizeString(result.output) === normalizeString(selectedQuestion.visibleOutput)) {
      setOutput(`Output matched!\n\nExecution Output:\n${result.output}`);
    } else {
      setOutput(`Output mismatch or error.\n\nExpected:\n${selectedQuestion.visibleOutput}\n\nGot:\n${result.output}`);
    }
    setLoadingOverlayMsg(null);
    setIsCompiling(false);
  };

  const handleSubmit = async () => {
    if (!selectedQuestion) return;
    setIsCompiling(true);
    setCheckingHidden(true);
    setLoadingOverlayMsg('Running Hidden Test Cases...');
    await new Promise(r => setTimeout(r, 1000));
    setOutput('Running hidden test cases...');
    
    const result = await executeCode(code, language, selectedQuestion.hiddenInput);
    
    await setDoc(doc(db, 'users', lotNo), {
      totalSubmissions: increment(1)
    }, { merge: true });

    if (result.success && normalizeString(result.output) === normalizeString(selectedQuestion.hiddenOutput)) {
      const endTimestamp = new Date();
      let startTimestamp = endTimestamp;
      try {
        const snap = await getDoc(doc(db, 'user_code', `${lotNo}_${selectedQuestion.id}`));
        if (snap.exists() && snap.data().startTime) {
          const st = snap.data().startTime.toDate ? snap.data().startTime.toDate() : new Date(snap.data().startTime);
          if (!isNaN(st.getTime())) startTimestamp = st;
        } else {
          const localSt = localStorage.getItem(`codathan_start_${lotNo}_${selectedQuestion.id}`);
          if (localSt) startTimestamp = new Date(parseInt(localSt));
        }
      } catch (e) {}

      const durationSeconds = Math.max(1, Math.round((endTimestamp.getTime() - startTimestamp.getTime()) / 1000));

      setOutput(`Success! All test cases passed.\n\nExecution Output:\n${result.output}`);
      await setDoc(doc(db, 'user_code', `${lotNo}_${selectedQuestion.id}`), {
        isSubmitted: true,
        passed: true,
        startTime: startTimestamp,
        endTime: endTimestamp,
        durationSeconds: durationSeconds
      }, { merge: true });
      
      await setDoc(doc(db, 'users', lotNo), {
        completedQuestions: increment(1),
        totalPoints: increment(selectedQuestion.points),
        totalTimeSeconds: increment(durationSeconds),
        lastSubmitTime: new Date()
      }, { merge: true });

      setLoadingOverlayMsg('Success! Returning to Missions...');
      await new Promise(r => setTimeout(r, 1500));
      setViewMode('list');
    } else {
      setOutput(`Failed hidden test cases.\nCheck your logic again.`);
    }
    setLoadingOverlayMsg(null);
    setCheckingHidden(false);
    setIsCompiling(false);
  };

  const getRoundStatus = (roundIndex) => {
    if (roundIndex === 0) return 'unlocked';
    for (let i = 0; i < roundIndex; i++) {
      const prevRound = filteredRounds[i];
      const prevQ = filteredQuestions.filter(q => q.roundId === prevRound.id);
      if (prevQ.length > 0) {
        const allPrevSolved = prevQ.every(q => passedQuestionIds.includes(q.id));
        if (!allPrevSolved) return 'locked';
      }
    }
    return 'unlocked';
  };

  if (roundFinished) {
    const allPassed = filteredQuestions.length > 0 && filteredQuestions.every(q => passedQuestionIds.includes(q.id));
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)', zIndex: 50, position: 'fixed', inset: 0 }}>
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', border: '1px solid var(--accent-success)' }}>
          <h1 className="hacker-title" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {allPassed ? '> ALL_MISSIONS_CLEARED' : '> TIME_IS_UP'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.5rem', marginTop: '2rem' }}>
            Event will end soon. Please wait for the administrator...
          </p>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)', zIndex: 50, position: 'fixed', inset: 0 }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <h1 className="text-gradient" style={{ fontSize: '5rem' }}>EVENT STARTS NOW</h1>
        </motion.div>
      </div>
    );
  }

  if (loadingOverlayMsg) {
    return <LoadingOverlay message={loadingOverlayMsg} />;
  }

  if (showCheatWarning) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)', zIndex: 100, position: 'fixed', inset: 0, flexDirection: 'column' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', border: '2px solid var(--accent-danger)' }}>
          <AlertTriangle size={64} style={{ margin: '0 auto 1rem', color: 'var(--accent-danger)' }} />
          <h1 style={{ color: 'var(--accent-danger)', marginBottom: '1rem' }}>WARNING: VIOLATION DETECTED</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px' }}>
            You have navigated away from this window, minimized it, or switched tabs. This is strictly prohibited. Your action has been flagged and recorded by the administrator.
          </p>
          <button className="danger" style={{ padding: '1rem 3rem', fontSize: '1.2rem' }} onClick={() => {
            setShowCheatWarning(false);
            enterFullscreen();
          }}>
            I Understand, Return to Event
          </button>
        </div>
      </div>
    );
  }

  if (!isFullscreen) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Monitor size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent-warning)' }} />
          <h2 style={{ marginBottom: '1rem' }}>Fullscreen Required</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>You must enter fullscreen mode to participate in this event.</p>
          <button className="primary" onClick={enterFullscreen}>Enter Fullscreen</button>
        </div>
      </div>
    );
  }

  if (eventData?.status !== 'active') {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Clock size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent-warning)' }} />
          <h2 style={{ marginBottom: '1rem' }}>Please Wait</h2>
          <p style={{ color: 'var(--text-secondary)' }}>The event has not been started by the administrator yet.</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="container" style={{ paddingTop: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <h1 className="text-gradient" style={{ margin: 0 }}>Event Missions</h1>
            {timeLeftStr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--accent-danger)', fontWeight: 'bold', fontSize: '1.2rem', border: '1px solid var(--glass-border)' }}>
                <Clock size={20} />
                {timeLeftStr}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{
              padding: '0.3rem 0.9rem',
              borderRadius: '16px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              background: userCategory === 'PG' ? 'rgba(255, 0, 255, 0.2)' : 'rgba(0, 245, 155, 0.2)',
              color: userCategory === 'PG' ? '#ff00ff' : '#00f59b',
              border: `1px solid ${userCategory === 'PG' ? '#ff00ff' : '#00f59b'}`
            }}>
              {userCategory} Student Sector
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>Lot: {lotNo}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '4rem' }}>
          {filteredRounds.map((round, rIdx) => {
            const roundQuestions = filteredQuestions.filter(q => q.roundId === round.id);
            const status = getRoundStatus(rIdx);
            const isLocked = status === 'locked';

            return (
              <div key={round.id}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isLocked ? 0.5 : 1, borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                  {isLocked && <Lock size={24} color="var(--accent-warning)" />} 
                  {round.name} {isLocked && <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '1rem' }}>(Complete previous rounds to unlock)</span>}
                </h2>
                <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
                  {roundQuestions.map((q) => {
                    const isPassed = passedQuestionIds.includes(q.id);
                    return (
                      <div key={q.id} className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: isPassed ? '2px solid var(--accent-success)' : '', opacity: isLocked ? 0.5 : 1 }}>
                        <div>
                          <h3 style={{ margin: 0 }}>{q.title}</h3>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <span style={{ background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--accent-warning)' }}>
                              {q.difficulty}
                            </span>
                            <span style={{ background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--accent-success)' }}>
                              {q.points} pts
                            </span>
                          </div>
                        </div>
                        <button 
                          className={isPassed ? "success flex-center" : (isLocked ? "secondary flex-center" : "primary flex-center")} 
                          onClick={() => handleOpenQuestion(q)}
                          disabled={isLocked}
                        >
                          {isLocked ? <Lock size={20} style={{ marginRight: '0.5rem' }} /> : (isPassed ? <Check size={20} style={{ marginRight: '0.5rem' }} /> : <Code2 size={20} style={{ marginRight: '0.5rem' }} />)}
                          {isLocked ? 'Locked' : (isPassed ? 'Solved' : 'Code Now')}
                        </button>
                      </div>
                    )
                  })}
                  {roundQuestions.length === 0 && (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No questions assigned to {userCategory} Sector in this round yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {filteredRounds.length === 0 && (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Event structure is currently being prepared for {userCategory} Sector.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Navbar */}
      <div className="glass-panel" style={{ borderRadius: 0, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button className="secondary flex-center" onClick={() => setViewMode('list')} style={{ padding: '0.5rem 1rem' }}>
            <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back
          </button>
          
          <h3 style={{ margin: 0 }}>{selectedQuestion?.title}</h3>

          <select 
            value={language} 
            onChange={(e) => {
              const newLang = e.target.value;
              setLanguage(newLang);
              if (selectedQuestion) {
                localStorage.setItem(`codathan_lang_${lotNo}_${selectedQuestion.id}`, newLang);
                const savedLangCode = localStorage.getItem(`codathan_code_${lotNo}_${selectedQuestion.id}_${newLang}`);
                setCode(savedLangCode || STARTER_CODE[newLang] || '');
              } else {
                setCode(STARTER_CODE[newLang] || '');
              }
            }} 
            style={{ padding: '0.5rem', background: 'var(--bg-secondary)', marginLeft: '1rem' }}
          >
            {enabledLanguages['c'] && <option value="c">C</option>}
            {enabledLanguages['cpp'] || enabledLanguages['c++'] ? <option value="c++">C++</option> : null}
            {enabledLanguages['java'] && <option value="java">Java</option>}
            {enabledLanguages['python'] && <option value="python">Python</option>}
          </select>

          {timeLeftStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--accent-warning)', fontWeight: 'bold', border: '1px solid var(--glass-border)' }}>
              <Clock size={16} />
              {timeLeftStr}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="secondary flex-center" onClick={handleRun} disabled={isCompiling}>
            <Play size={16} style={{ marginRight: '0.5rem' }} /> Run Code
          </button>
          <button className="success flex-center" onClick={handleSubmit} disabled={isCompiling}>
            {checkingHidden ? (
              <Loader2 className="animate-spin" size={16} style={{ marginRight: '0.5rem' }} />
            ) : (
              <Check size={16} style={{ marginRight: '0.5rem' }} />
            )}
            {checkingHidden ? 'Checking...' : 'Submit'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Side: Question Details */}
        <div className="glass-panel" style={{ width: '40%', margin: '1rem', padding: '2rem', overflowY: 'auto' }}>
          {selectedQuestion && (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>{selectedQuestion.title}</h2>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <span style={{ background: 'var(--bg-secondary)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--accent-warning)' }}>
                  {selectedQuestion.difficulty}
                </span>
                <span style={{ background: 'var(--bg-secondary)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--accent-success)' }}>
                  {selectedQuestion.points} pts
                </span>
              </div>
              
              <div style={{ lineHeight: '1.8', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                {selectedQuestion.description}
              </div>

              <div style={{ marginTop: '3rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Sample Input</h4>
                <pre style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                  {selectedQuestion.visibleInput}
                </pre>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Sample Output</h4>
                <pre style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                  {selectedQuestion.visibleOutput}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Editor & Terminal */}
        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', margin: '1rem 1rem 1rem 0' }}>
          <div className="glass-panel" style={{ flex: 2, overflow: 'hidden', padding: '0.5rem' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={language === 'c++' || language === 'c' ? 'cpp' : language}
              value={code}
              onChange={handleCodeChange}
              options={{ minimap: { enabled: false }, fontSize: 16 }}
            />
          </div>
          
          <div className="glass-panel" style={{ flex: 1, marginTop: '1rem', padding: '1rem', overflowY: 'auto', background: '#000' }}>
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Console Output</h4>
            <pre style={{ color: 'var(--accent-success)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)' }}>
              {output || "Run your code to see output..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
