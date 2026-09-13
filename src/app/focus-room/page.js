"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './focus.module.css';

// Reusable Autocomplete Component
function TopicInput({ value, onChange }) {
  const [allTopics, setAllTopics] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    fetch('/api/topics')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllTopics(data); })
      .catch(e => console.error(e));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = allTopics.filter(t => t.toLowerCase().includes(value.toLowerCase()) && t.toLowerCase() !== value.toLowerCase());

  return (
    <div className={styles.topicInputWrapper} ref={wrapperRef}>
      <input 
        required 
        type="text" 
        value={value} 
        onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }} 
        onFocus={() => setShowDropdown(true)}
        placeholder="Select existing or type a new topic..." 
      />
      {showDropdown && filtered.length > 0 && (
        <ul className={styles.autocompleteDropdown}>
          {filtered.map(t => (
            <li key={t} onClick={() => { onChange(t); setShowDropdown(false); }}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FocusRoom() {
  const router = useRouter();
  
  // View states: 'setup' | 'running' | 'logging_attempts' | 'saving' | 'saved'
  const [phase, setPhase] = useState('setup');
  
  const [formData, setFormData] = useState({ name: '', topic: '', difficulty: 'JEE Mains', summary: '' });
  
  // Timer States
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [solveStartTime, setSolveStartTime] = useState(null);
  const [solveCurrentTime, setSolveCurrentTime] = useState(null);
  const [finalTimeStr, setFinalTimeStr] = useState("");
  const [attempts, setAttempts] = useState("1");
  
  const [lastSavedId, setLastSavedId] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const sessionInterval = setInterval(() => setSessionSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(sessionInterval);
  }, []);

  useEffect(() => {
    if (phase === 'running') {
      const updateTimer = () => {
        setSolveCurrentTime(Date.now());
        rafRef.current = requestAnimationFrame(updateTimer);
      };
      rafRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Don't intercept Spacebar if the user is typing in the attempts input!
      if (e.code === 'Space') {
        if (phase === 'running') {
          e.preventDefault(); 
          handleStopTimer();
        } else if (phase === 'saved') {
          e.preventDefault();
          setPhase('setup');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, solveStartTime, formData, attempts]);

  const handleStart = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.summary) return;
    setSolveStartTime(Date.now());
    setSolveCurrentTime(Date.now());
    setPhase('running');
  };

  const handleStopTimer = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setSolveCurrentTime(Date.now()); 
    const totalMs = Date.now() - solveStartTime;
    const totalSeconds = Math.floor(totalMs / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    
    setFinalTimeStr(`${m > 0 ? m + 'm ' : ''}${s}s`);
    
    setPhase('logging_attempts');
    setAttempts("1"); 
  };

  const handleUploadToDB = async (e) => {
    if (e) e.preventDefault();
    setPhase('saving');

    try {
      // Ensures that whatever they type is caught mathematically
      const parsedAttempts = parseInt(attempts, 10);
      const finalAttempts = isNaN(parsedAttempts) || parsedAttempts < 1 ? 1 : parsedAttempts;

      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          topic: formData.topic || 'Uncategorized',
          difficulty: formData.difficulty,
          summary: formData.summary,
          time: finalTimeStr,
          attempts: finalAttempts
        })
      });
      
      const savedDoc = await res.json();
      setLastSavedId(savedDoc._id);
      setFormData({ name: '', topic: '', summary: '' });
      setPhase('saved');
    } catch (err) {
      console.error(err);
      alert("Failed to upload.");
      setPhase('setup');
    }
  };

  const formatSessionTime = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatSolveTime = () => {
    if (!solveStartTime || !solveCurrentTime) return "00:00";
    const diff = solveCurrentTime - solveStartTime;
    const totalS = Math.floor(diff / 1000);
    const s = totalS % 60;
    const m = Math.floor(totalS / 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.zenMode}>
      <button onClick={() => router.push('/')} className={styles.exitBtn}>← Exit Room</button>
      
      <div className={styles.sessionTimer}>
        <span className={styles.sessionLabel}>Session</span>
        {formatSessionTime(sessionSeconds)}
      </div>

      {phase === 'setup' && (
        <form className={styles.setupContainer} onSubmit={handleStart}>
          <h1 className={styles.title}>Flow State</h1>
          
          <div className={styles.formGroup}>
            <label>Question Name</label>
            <input required autoFocus type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="What are you working on?" />
          </div>
          <div className={styles.formGroup}>
            <label>Topic</label>
            <TopicInput value={formData.topic} onChange={(val) => setFormData({...formData, topic: val})} />
          </div>
          <div className={styles.formGroup}>
            <label>Summary / Goal</label>
            <textarea required value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} placeholder="Briefly describe the objective..." rows={3} />
          </div>
          <button type="submit" className={styles.startBtn}>Enter Focus Mode</button>
        </form>
      )}

      {(phase === 'running' || phase === 'logging_attempts' || phase === 'saving') && (
        <>
          <h1 className={styles.hugeTimer} style={{ opacity: phase === 'running' ? 1 : 0.5 }}>{formatSolveTime()}</h1>
          {phase === 'running' && <div className={styles.timerHint}>Press [SPACEBAR] to stop</div>}
        </>
      )}

      {phase === 'logging_attempts' && (
        <form className={styles.attemptsBox} onSubmit={handleUploadToDB}>
           <label>How many attempts did it take?</label>
           
           {/* TYPE="TEXT" used here to allow full physical keyboard typing across all browers! */}
           <input 
             type="text" 
             inputMode="numeric"
             pattern="[0-9]*"
             className={styles.attemptsInput} 
             value={attempts} 
             onChange={e => setAttempts(e.target.value)}
             autoFocus 
             onFocus={(e) => e.target.select()}
           />
           
           <button type="submit" className={styles.startBtn} style={{background: 'linear-gradient(90deg, #ff0080, #7928ca)'}}>Save to Database</button>
        </form>
      )}

      {phase === 'saved' && (
        <div style={{textAlign: 'center'}}>
           <div className={styles.savedMsg}>Document Uploaded!</div>
           <div className={styles.savedSub}>Would you like to attach a picture of your physical solution?</div>
           
           <div className={styles.actionRow}>
              <button onClick={() => lastSavedId && router.push(`/question/${lastSavedId}`)} className={styles.uploadChoiceBtn}>
                 📷 Upload Solution
              </button>
              <button onClick={() => setPhase('setup')} className={styles.skipBtn}>
                 Skip & New (Spacebar)
              </button>
           </div>
        </div>
      )}

    </div>
  );
}
