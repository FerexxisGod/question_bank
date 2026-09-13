"use client";
import { useEffect, useState } from 'react';

export default function KeyVault() {
  const [mounted, setMounted] = useState(false);
  const [hasKeys, setHasKeys] = useState(true);
  const [mongoUri, setMongoUri] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    setMounted(true);
    const m = sessionStorage.getItem('custom_mongo');
    const g = sessionStorage.getItem('custom_gemini');
    
    if (!m || !g) {
      setHasKeys(false);
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (!mongoUri || !geminiKey) return;
    sessionStorage.setItem('custom_mongo', mongoUri);
    sessionStorage.setItem('custom_gemini', geminiKey);
    // Hard refresh ensures the deeply injected script in layout.js 
    // runs synchronously and patches window.fetch properly on load
    window.location.reload(); 
  };

  if (!mounted || hasKeys) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(15px)', zIndex:999999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <form onSubmit={handleSave} style={{ background:'#111', padding:'3rem', borderRadius:'20px', border:'1px solid #333', width:'90%', maxWidth:'500px', boxShadow:'0 20px 50px rgba(0,0,0,0.5)' }}>
         <h2 style={{ color:'#fff', margin:'0 0 1rem 0', fontSize:'2rem' }}>Welcome to Question Bank</h2>
         <p style={{ color:'#888', marginBottom:'2rem', lineHeight:'1.5' }}>
           To use this application on Vercel, supply your private database and AI keys. 
           These keys exist <strong>exclusively in memory</strong> and will securely self-destruct the moment you close this tab.
         </p>
         
         <div style={{ marginBottom:'1.5rem' }}>
           <label style={{ display:'block', color:'#ccc', marginBottom:'0.5rem', fontWeight:'bold' }}>MongoDB Connection String</label>
           <input required type="password" value={mongoUri} onChange={e=>setMongoUri(e.target.value)} placeholder="mongodb+srv://..." style={{ width:'100%', padding:'1rem', borderRadius:'12px', border:'2px solid #333', background:'#000', color:'#fff', fontSize:'1rem', outline:'none' }} />
         </div>

         <div style={{ marginBottom:'2.5rem' }}>
           <label style={{ display:'block', color:'#ccc', marginBottom:'0.5rem', fontWeight:'bold' }}>Google Gemini API Key</label>
           <input required type="password" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{ width:'100%', padding:'1rem', borderRadius:'12px', border:'2px solid #333', background:'#000', color:'#fff', fontSize:'1rem', outline:'none' }} />
         </div>

         <button type="submit" style={{ width:'100%', padding:'1rem', background:'linear-gradient(90deg, #ff0080, #7928ca)', color:'#fff', border:'none', borderRadius:'50px', fontSize:'1.1rem', fontWeight:'bold', cursor:'pointer', transition:'transform 0.2s' }}>
           Initialize Secure Session
         </button>
      </form>
    </div>
  );
}
