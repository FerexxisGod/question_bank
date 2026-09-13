"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

function TopicInput({ value, onChange }) {
  const [allTopics, setAllTopics] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);
  useEffect(() => {
    fetch('/api/topics').then(r => r.json()).then(data => { if (Array.isArray(data)) setAllTopics(data); }).catch(e => console.error(e));
  }, []);
  useEffect(() => {
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowDropdown(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filtered = allTopics.filter(t => t.toLowerCase().includes(value.toLowerCase()) && t.toLowerCase() !== value.toLowerCase());
  return (
    <div className={styles.topicInputWrapper} ref={wrapperRef}>
      <input required type="text" value={value} onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Select existing or type a new topic..." />
      {showDropdown && filtered.length > 0 && (
        <ul className={styles.autocompleteDropdown}>
          {filtered.map(t => ( <li key={t} onClick={() => { onChange(t); setShowDropdown(false); }}>{t}</li> ))}
        </ul>
      )}
    </div>
  );
}

export default function UploadModes() {
  const [mode, setMode] = useState('single'); 
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Upload to Question Bank</h1>
      <div className={styles.modeSelector}>
        <button className={`${styles.modeBtn} ${mode === 'single' ? styles.active : ''}`} onClick={() => setMode('single')}>One Question</button>
        <button className={`${styles.modeBtn} ${mode === 'bulk' ? styles.active : ''}`} onClick={() => setMode('bulk')}>Bulk Upload (AI)</button>
      </div>
      {mode === 'single' ? <SingleUpload /> : <BulkUpload />}
    </div>
  );
}

function SingleUpload() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [formData, setFormData] = useState({ name: '', topic: '', difficulty: 'JEE Mains', time: '', summary: '', attempts: '1' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Submitting...');
    const payload = { ...formData, attempts: parseInt(formData.attempts, 10) || 1 };
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus('Success! Redirecting...');
        setTimeout(() => router.push('/'), 1000);
      } else { setStatus('Error uploading question.'); }
    } catch { setStatus('Network Error.'); }
  };
  return (
    <form className={styles.formBox} onSubmit={handleSubmit}>
      {status && <div className={status.includes('Error') ? styles.error : styles.success}>{status}</div>}
      
      <div className={styles.formGroup}>
        <label>Question Name</label>
        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Reverse Linked List" />
      </div>
      
      <div style={{display:'flex', gap:'1rem'}}>
        <div className={styles.formGroup} style={{flex: 2}}>
          <label>Topic</label>
          <TopicInput value={formData.topic} onChange={(val) => setFormData({...formData, topic: val})} />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label>Difficulty</label>
          <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
             <option value="JEE Mains">JEE Mains</option>
             <option value="JEE Advance">JEE Advance</option>
             <option value="EX1">EX1</option>
             <option value="EX2">EX2</option>
          </select>
        </div>
      </div>

      <div style={{display:'flex', gap:'1rem'}}>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label>Time Taken</label>
          <input required type="text" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} placeholder="e.g. 15 mins" />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label>Attempts</label>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={formData.attempts} onChange={e => setFormData({...formData, attempts: e.target.value})} />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Summary</label>
        <textarea required value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} placeholder="A concise summary..." rows={4} />
      </div>
      <button type="submit" className={styles.submitBtn} disabled={status === 'Submitting...'}>Save Question</button>
    </form>
  );
}

function BulkUpload() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [topic, setTopic] = useState('');
  const [masterDifficulty, setMasterDifficulty] = useState('JEE Mains');
  const [customPrompt, setCustomPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  
  const handleImageChange = (e) => { if (e.target.files) setImages(prev => [...prev, ...Array.from(e.target.files)]); };
  const removeImage = (indexToRemove) => setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));

  const handleGenerate = async () => {
    if (images.length === 0 || !topic) return setStatus('Please provide a topic and at least one image.');
    setStatus(`Generating details for ${images.length} questions...`);
    const formData = new FormData();
    images.forEach(img => formData.append('images', img));
    formData.append('customPrompt', customPrompt);
    try {
      const res = await fetch('/api/gemini', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      
      const mappedQuestions = data.map(q => ({ topic: topic, difficulty: masterDifficulty, name: q.name || '', summary: q.summary || '', time: '', attempts: '1' }));
      setGeneratedQuestions(mappedQuestions);
      setStatus(null);
    } catch (err) { setStatus('Error calling Gemini: ' + err.message); }
  };
  const updateIndividualQuestion = (index, field, value) => {
    setGeneratedQuestions(prev => { const newArr = [...prev]; newArr[index][field] = value; return newArr; });
  };
  const handleSave = async (e) => {
    e.preventDefault();
    setStatus('Saving all questions to DB...');
    try {
      await Promise.all(
        generatedQuestions.map(q => {
          const payload = { ...q, attempts: parseInt(q.attempts, 10) || 1 };
          return fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        })
      );
      setStatus('Successfully Saved! Redirecting...');
      setTimeout(() => router.push('/'), 1200);
    } catch { setStatus('Network Error during save.'); }
  };

  return (
    <div className={styles.formBox}>
      {status && <div className={status.includes('Error') ? styles.error : styles.success}>{status}</div>}
      {generatedQuestions.length === 0 ? (
        <>
          <div style={{display:'flex', gap:'1rem'}}>
            <div className={styles.formGroup} style={{flex: 2}}>
              <label>Master Topic (Applied to all images)</label>
              <TopicInput value={topic} onChange={(val) => setTopic(val)} />
            </div>
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>Master Difficulty</label>
              <select value={masterDifficulty} onChange={e => setMasterDifficulty(e.target.value)}>
                 <option value="JEE Mains">JEE Mains</option>
                 <option value="JEE Advance">JEE Advance</option>
                 <option value="EX1">EX1</option>
                 <option value="EX2">EX2</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Custom Gemini Prompt (Optional)</label>
            <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="e.g. Make sure the name is short" rows={3} />
          </div>
          <div className={styles.formGroup}>
            <label>Upload Problem Images (1 per question)</label>
            <input type="file" multiple accept="image/*" onChange={handleImageChange} className={styles.fileInputArea} />
            {images.length > 0 && (
              <div className={styles.imagePreviewList}>
                {images.map((img, idx) => (
                  <div key={idx} className={styles.imageBadge}>
                    <span>📷 {img.name}</span>
                    <button type="button" onClick={() => removeImage(idx)} className={styles.removeBtn}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={handleGenerate} className={styles.submitAiBtn} disabled={status?.includes('Generating') || images.length === 0 || !topic}>✨ Extract {images.length > 0 ? images.length : ''} Questions</button>
        </>
      ) : (
        <form onSubmit={handleSave} style={{display:'flex', flexDirection:'column', gap:'2rem'}}>
          {generatedQuestions.map((q, i) => (
            <div key={i} style={{ padding: '1.5rem', background: 'rgba(121,40,202,0.05)', borderRadius: '12px', border: '1px solid rgba(121,40,202,0.2)' }}>
               <h3 style={{ margin: '0 0 1rem 0', color: 'var(--foreground)' }}>Image {i + 1} Extracted</h3>
               <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                 
                 <div style={{display:'flex', gap:'1rem'}}>
                   <div className={styles.formGroup} style={{flex: 2}}>
                     <label>Question Name</label>
                     <input required type="text" value={q.name} onChange={e => updateIndividualQuestion(i, 'name', e.target.value)} />
                   </div>
                   <div className={styles.formGroup} style={{flex: 1}}>
                     <label>Difficulty</label>
                     <select value={q.difficulty} onChange={e => updateIndividualQuestion(i, 'difficulty', e.target.value)}>
                        <option value="JEE Mains">JEE Mains</option>
                        <option value="JEE Advance">JEE Advance</option>
                        <option value="EX1">EX1</option>
                        <option value="EX2">EX2</option>
                     </select>
                   </div>
                 </div>

                 <div style={{display:'flex', gap:'1rem'}}>
                   <div className={styles.formGroup} style={{flex: 1}}>
                     <label>Time Taken</label>
                     <input type="text" value={q.time} onChange={e => updateIndividualQuestion(i, 'time', e.target.value)} placeholder="Blank by default" />
                   </div>
                   <div className={styles.formGroup} style={{flex: 1}}>
                     <label>Attempts</label>
                     <input type="text" inputMode="numeric" pattern="[0-9]*" value={q.attempts} onChange={e => updateIndividualQuestion(i, 'attempts', e.target.value)} />
                   </div>
                 </div>
                 <div className={styles.formGroup}>
                   <label>Summary</label>
                   <textarea required value={q.summary} onChange={e => updateIndividualQuestion(i, 'summary', e.target.value)} rows={3} />
                 </div>
               </div>
            </div>
          ))}
          <button type="submit" className={styles.submitBtn}>Save {generatedQuestions.length} Documents to Database</button>
        </form>
      )}
    </div>
  );
}
