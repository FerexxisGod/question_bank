"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import styles from './page.module.css';

export default function QuestionDetail({ params }) {
  const { id } = params;
  const router = useRouter(); 
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState('');

  const [solutionImage, setSolutionImage] = useState(null);
  const [savedAiSolution, setSavedAiSolution] = useState('');
  
  const [confirmText, setConfirmText] = useState('');
  const [geminiActive, setGeminiActive] = useState(false);
  
  const [modelChoice, setModelChoice] = useState('pro');
  const [prompt, setPrompt] = useState('Please analyze the original problem and my uploaded solution, then explain how to derive the correct answer step-by-step.');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [savingText, setSavingText] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const res = await fetch(`/api/questions/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setQ(data);
        
        if (data.solutionImage) setSolutionImage(data.solutionImage);
        
        if (data.aiSolutionLocalPath) {
           const mdText = data.aiSolutionLocalPath;
           // fetched instantly from DB string
           setSavedAiSolution(mdText);
        }
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [id]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setUploadStatus('Processing and saving locally...');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const b64 = reader.result;
      try {
        const res = await fetch(`/api/questions/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ solutionImage: b64 })
        });
        if(res.ok) {
           const finalObj = await res.json();
           setSolutionImage(finalObj.solutionImage); 
           setUploadStatus('Solution firmly encoded and saved to Database!');
        } else {
           setUploadStatus('Failed to save.');
        }
      } catch {
        setUploadStatus('Network error.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    if (!window.confirm("Are you sure you want to delete this securely saved solution image?")) return;
    setUploadStatus("Removing image...");
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ removeSolutionImage: true })
      });
      if (res.ok) {
         setSolutionImage(null);
         setUploadStatus("Image successfully erased from the database!");
      } else {
         setUploadStatus("Failed to remove image.");
      }
    } catch {
       setUploadStatus("Network error removing image.");
    }
  };

  const handleAskGemini = async () => {
     if(!prompt.trim()) return;
     setLoadingAi(true);
     setAiResponse('');
     try {
       const fullContextPrompt = `Context: This is a question named "${q.name}" under the topic "${q.topic}". 
       Initial summary provided: "${q.summary}".\n\nUser Question:\n${prompt}`;

       const res = await fetch('/api/gemini/chat', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ prompt: fullContextPrompt, modelChoice, imageBase64: solutionImage?.startsWith('data:') ? solutionImage : null })
       });
       const data = await res.json();
       if(res.ok) setAiResponse(data.response);
       else setAiResponse("Error: " + data.error);
     } catch(e) {
       setAiResponse("Network Error");
     } finally {
       setLoadingAi(false);
     }
  };

  const saveAiSolutionLocal = async () => {
    setSavingText(true);
    try {
      await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ aiSolutionText: aiResponse })
      });
      setSavedAiSolution(aiResponse);
      setAiResponse(''); 
    } catch (e) {
      console.error(e);
    } finally {
      setSavingText(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this question? This will wipe the MongoDB record and destroy your saved solution associated with it.")) return;
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/'); 
      else alert("Failed to delete the question from the database.");
    } catch(e) {
       alert("Network Error.");
    }
  };

  if(loading) return <div className={styles.container}>Loading question details...</div>;
  if(!q) return <div className={styles.container}>Question not found or deleted.</div>;

  return (
    <div className={styles.container}>
      <Link className={styles.backLink} href="/">&larr; Back to Dashboard</Link>
      
      {/* 1. Original Question Details */}
      <div className={styles.card}>
        <h1 className={styles.title}>{q.name}</h1>
        
        {/* REDESIGNED CLEAN META BAR */}
        <div className={styles.metaBadgeContainer}>
          <div className={styles.metaBadge}>
            <span style={{fontSize:'1.2rem'}}>🔥</span>
            <span style={{fontWeight:'bold', color: '#ff0080'}}>{q.difficulty || 'Unspecified'}</span>
          </div>
          <div className={styles.metaBadge}>
            <span style={{fontSize:'1.2rem'}}>📚</span>
            <span>{q.topic}</span>
          </div>
          
          <div className={styles.metaBadge}>
            <span style={{fontSize:'1.2rem'}}>⏱️</span>
            <span style={{fontWeight:'bold', color: '#ff0080'}}>{q.time || 'N/A'}</span>
          </div>

          <div className={styles.metaBadge}>
            <span style={{fontSize:'1.2rem'}}>🎯</span>
            <span style={{fontWeight:'bold', color: '#0070f3'}}> {q.attempts || 1} Attempt{(q.attempts || 1) !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <p className={styles.summary}>{q.summary}</p>
      </div>

      {/* 2. Solution Upload Area */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>My Embedded Solution</h2>
        <p style={{color: '#666', marginBottom: '1rem'}}>
           Files are saved directly into your MongoDB cluster securely as Base64 strings.
        </p>
        
        {solutionImage ? (
          <div>
            <img src={solutionImage} alt="Your Solution" className={styles.solutionPreview} />
            <button onClick={handleRemoveImage} className={styles.removeImageBtn}>
              🗑️ Delete Locally Saved Image
            </button>
          </div>
        ) : (
          <input type="file" accept="image/*" onChange={handleImageUpload} className={styles.fileInput} />
        )}
        
        {uploadStatus && <p style={{marginTop: '0.8rem', fontWeight: 'bold'}}>{uploadStatus}</p>}
      </div>

      {/* Previous AI Archived Solution (Local) */}
      {savedAiSolution && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Saved AI Solution Vault</h2>
           <div className={`${styles.aiResponseBox} ${styles.markdownBody}`}>
              <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {savedAiSolution}
              </Markdown>
           </div>
        </div>
      )}

      {/* 3. Gemini Assistant Integration */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>AI Assitance Module</h2>
        
        {!geminiActive ? (
          <div className={styles.gate}>
            <p style={{fontSize: '1.2rem', margin: 0}}>
              Generating solutions using Google's generative models consumes API quotas. 
              <br/>To unlock the Gemini Assistant for this problem, explicitly confirm below.
            </p>
            <input 
              type="text" 
              value={confirmText} 
              onChange={e => {
                setConfirmText(e.target.value);
                if(e.target.value.toLowerCase() === 'confirm') setGeminiActive(true);
              }} 
              placeholder="Type 'confirm'" 
              className={styles.confirmInput} 
            />
          </div>
        ) : (
          <div>
            <div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem'}}>
               <strong style={{minWidth: '120px'}}>Brain Power:</strong>
               <select value={modelChoice} onChange={e => setModelChoice(e.target.value)} className={styles.modelSelect}>
                 <option value="pro">Pro Mode (Deep Reasoning, Best accuracy)</option>
                 <option value="flash">Flash Mode (Faster, Lighter logic)</option>
               </select>
            </div>
            
            <strong style={{display: 'block', marginBottom: '1rem'}}>What do you need help with?</strong>
            <textarea 
              className={styles.aiPrompt} 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
              rows={4}
            />
            
            <button className={styles.askBtn} onClick={handleAskGemini} disabled={loadingAi}>
              {loadingAi ? '🧠 Thinking...' : '✨ Ask Gemini'}
            </button>
            
            {aiResponse && (
              <div className={`${styles.aiResponseBox} ${styles.markdownBody}`}>
                 <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                   {aiResponse}
                 </Markdown>
                <div style={{marginTop: '2rem'}}>
                  <button onClick={saveAiSolutionLocal} className={styles.saveAiBtn}>
                    {savingText ? 'Saving...' : '💾 Save Output to Database'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{textAlign: 'center', margin: '2rem 0', paddingBottom: '3rem'}}>
        <button onClick={handleDelete} className={styles.deleteBtn}>
          🗑️ Permanently Delete Question
        </button>
      </div>

    </div>
  );
}
