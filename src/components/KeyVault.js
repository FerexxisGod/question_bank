"use client";
import { useEffect, useState } from 'react';

export default function KeyVault() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosable, setIsClosable] = useState(false);
  const [mongoUri, setMongoUri] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    setMounted(true);
    const m = localStorage.getItem('custom_mongo');
    const g = localStorage.getItem('custom_gemini');
    
    // Auto-open forcefully if missing keys
    if (!m || !g) {
      setIsVisible(true);
      setIsClosable(false); 
    }

    // Global listener so the Account Badge can trigger this modal
    const handleOpen = () => {
      setMongoUri(localStorage.getItem('custom_mongo') || '');
      setGeminiKey(localStorage.getItem('custom_gemini') || '');
      setIsVisible(true);
      setIsClosable(true); // Allow closing since it's just a management view
    };

    window.addEventListener('openKeyVault', handleOpen);
    return () => window.removeEventListener('openKeyVault', handleOpen);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (!mongoUri || !geminiKey) return;
    localStorage.setItem('custom_mongo', mongoUri);
    localStorage.setItem('custom_gemini', geminiKey);
    window.location.reload(); 
  };

  const handleClear = () => {
    if (!window.confirm("This will erase your keys from this browser and effectively log you out. Continue?")) return;
    localStorage.removeItem('custom_mongo');
    localStorage.removeItem('custom_gemini');
    window.location.reload(); 
  };

  if (!mounted || !isVisible) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(15px)', zIndex:999999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <form onSubmit={handleSave} style={{ background:'#111', padding:'3rem', borderRadius:'20px', border:'1px solid #333', width:'90%', maxWidth:'500px', boxShadow:'0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }}>
         
         {isClosable && (
           <button 
             type="button" 
             onClick={() => setIsVisible(false)} 
             style={{ position: 'absolute', top: '15px', right: '20px', background: 'transparent', border: 'none', color: '#888', fontSize: '1.8rem', cursor: 'pointer', outline: 'none' }}
           >
             &times;
           </button>
         )}

         <h2 style={{ color:'#fff', margin:'0 0 1rem 0', fontSize:'2rem' }}>
           {isClosable ? 'Manage Secure Keys' : 'Welcome to Question Bank'}
         </h2>
         
         <p style={{ color:'#888', marginBottom:'2rem', lineHeight:'1.5' }}>
           {isClosable 
             ? "Update your private connection strings below. To switch to a completely different database or logout entirely, hit clear." 
             : "To use this application on Vercel, supply your private database and AI keys. These keys exist exclusively in memory and remain localized to your machine."}
         </p>
         
         <div style={{ marginBottom:'1.5rem' }}>
           <label style={{ display:'block', color:'#ccc', marginBottom:'0.5rem', fontWeight:'bold' }}>MongoDB Connection String</label>
           <input required type="password" value={mongoUri} onChange={e=>setMongoUri(e.target.value)} placeholder="mongodb+srv://..." style={{ width:'100%', padding:'1rem', borderRadius:'12px', border:'2px solid #333', background:'#000', color:'#fff', fontSize:'1rem', outline:'none' }} />
         </div>

         <div style={{ marginBottom:'2.5rem' }}>
           <label style={{ display:'block', color:'#ccc', marginBottom:'0.5rem', fontWeight:'bold' }}>Google Gemini API Key</label>
           <input required type="password" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{ width:'100%', padding:'1rem', borderRadius:'12px', border:'2px solid #333', background:'#000', color:'#fff', fontSize:'1rem', outline:'none' }} />
         </div>

         <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" style={{ flex: 2, padding:'1rem', background:'linear-gradient(90deg, #ff0080, #7928ca)', color:'#fff', border:'none', borderRadius:'50px', fontSize:'1.1rem', fontWeight:'bold', cursor:'pointer', transition:'transform 0.2s' }}>
              {isClosable ? 'Update & Refresh' : 'Initialize Secure Session'}
            </button>
            {isClosable && (
               <button type="button" onClick={handleClear} style={{ flex: 1, padding:'1rem', background:'transparent', border: '2px solid #444', color:'#fff', borderRadius:'50px', fontSize:'1rem', fontWeight:'bold', cursor:'pointer', transition:'transform 0.2s' }}>
                 Logout
               </button>
            )}
         </div>
      </form>
    </div>
  );
}
