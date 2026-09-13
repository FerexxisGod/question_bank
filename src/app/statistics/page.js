"use client";
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './stats.module.css';
import markdownStyles from '../question/[id]/page.module.css'; 

const parseTime = (str) => {
  if (!str) return 0;
  let mins = 0, secs = 0;
  const lowerStr = str.toLowerCase();
  const mMatch = lowerStr.match(/(\d+(?:\.\d+)?)\s*(?:m|min)/);
  const sMatch = lowerStr.match(/(\d+(?:\.\d+)?)\s*(?:s|sec)/);
  if (mMatch) mins = parseFloat(mMatch[1]);
  if (sMatch) secs = parseFloat(sMatch[1]);
  if (!mMatch && !sMatch) {
     const raw = parseFloat(str);
     if (!isNaN(raw)) mins = raw;
  }
  return (mins + (secs / 60));
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataRow = payload[0].payload;
    const isCumulative = payload[0].name === "Cumulative Questions";
    const isDifficulty = payload[0].name === "Avg Difficulty Speed (Mins)";

    return (
      <div style={{ background: '#111', padding: '12px 18px', borderRadius: '8px', color: '#fff', border: '1px solid #333', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
         <strong style={{ display: 'block', marginBottom: '5px', fontSize: '1.1rem' }}>
           {isCumulative ? `Date: ${label}` : (isDifficulty ? `Level: ${label}` : `Attempt #${label}`)}
         </strong>
         
         {dataRow.name && !isDifficulty && (
           <span style={{ fontSize: '0.9rem', color: '#aaa', display:'block', marginBottom: '10px'}}>{dataRow.name}</span>
         )}
         
         {payload.map((entry, index) => (
           <div key={index} style={{ color: entry.color, margin: '4px 0', fontSize: '0.95rem', fontWeight: 'bold' }}>
             {entry.name}: {entry.value}
           </div>
         ))}
      </div>
    );
  }
  return null;
};

export default function StatisticsPage() {
  const [allQuestions, setAllQuestions] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('combined');

  const [aiPrompt, setAiPrompt] = useState("Evaluate my speed across the different difficulty levels. Am I struggling specifically with JEE Advance problems compared to Mains?");
  const [aiResponse, setAiResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/questions');
        const data = await res.json();
        setAllQuestions(data);
        
        const topics = [...new Set(data.map(q => q.topic || 'Uncategorized'))].sort((a,b) => a.localeCompare(b));
        setAvailableTopics(topics);
        if (topics.length > 0) setSelectedTopic(topics[0]); 
      } catch(e) {
      } finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const filteredQuestions = allQuestions
    .filter(q => (q.topic || 'Uncategorized') === selectedTopic)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const chartData = filteredQuestions.map((q, index) => ({
    id: index + 1,
    name: q.name,
    difficulty: q.difficulty || 'Unspecified',
    dateStr: new Date(q.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
    Speed: parseFloat(parseTime(q.time).toFixed(2)),
    Attempts: q.attempts && !isNaN(q.attempts) ? q.attempts : 1
  }));

  let runTotal = 0;
  const cumulativeData = filteredQuestions.map(q => {
     runTotal++;
     return { rawDate: new Date(q.createdAt), dateStr: new Date(q.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}), name: q.name, Total: runTotal };
  });
  
  if (cumulativeData.length > 0) {
      const today = new Date();
      if (today.toDateString() !== cumulativeData[cumulativeData.length -1].rawDate.toDateString()) {
          cumulativeData.push({ rawDate: today, dateStr: 'Today', name: 'Current Milestone', Total: runTotal });
      }
  }

  // **NEW GRAPH: Average Time per Difficulty**
  const difficultyMap = {};
  filteredQuestions.forEach(q => {
     const diff = (q.difficulty && q.difficulty !== "Unspecified") ? q.difficulty : "JEE Mains";
     if (!difficultyMap[diff]) difficultyMap[diff] = { count: 0, time: 0 };
     difficultyMap[diff].count += 1;
     difficultyMap[diff].time += parseTime(q.time);
  });
  
  // Enforce rigid order so chart reads visually properly
  const difficultyOrder = ["JEE Mains", "JEE Advance", "EX1", "EX2"];
  const difficultyData = difficultyOrder
     .filter(d => difficultyMap[d]) 
     .map(level => ({
         name: level,
         AvgSpeed: parseFloat((difficultyMap[level].time / difficultyMap[level].count).toFixed(2))
     }));

  const totalQ = chartData.length;
  const avgSpeed = totalQ === 0 ? 0 : (chartData.reduce((acc, curr) => acc + curr.Speed, 0) / totalQ).toFixed(1);
  const avgAtt = totalQ === 0 ? 0 : (chartData.reduce((acc, curr) => acc + curr.Attempts, 0) / totalQ).toFixed(1);

  const handleConsultAI = async () => {
    if (!aiPrompt) return;
    setIsAiThinking(true);
    setAiResponse('');
    
    // AI context now passes the specific Difficulty tagged to each question!
    const timelineStr = chartData.map(s => 
      `Question ${s.id} [${s.dateStr}] [Difficulty: ${s.difficulty}] ("${s.name}") | Solved in ${s.Speed} mins | Took ${s.Attempts} Attempts.`
    ).join('\n');
    
    const diffAvgsStr = difficultyData.map(d => `${d.name}: ${d.AvgSpeed} mins/question`).join(', ');

    const corePrompt = `You are an elite data-driven studying coach analyzing my exact chronological history studying the topic: "${selectedTopic}".
    
MY PAST ${totalQ} QUESTIONS (Ordered Oldest -> Newest):
${timelineStr || 'No history.'}

SUMMARY BY DIFFICULTY:
${diffAvgsStr || 'N/A'}

GUIDELINES:
- Tell me exactly what my trajectory looks like over time. Are my times dropping? Are my required attempts falling?
- Analyze how I perform across the different Difficulty thresholds (EX1, EX2, JEE Mains, JEE Advance).
- Point out specific questions where I struggled.

USER PROMPT: ${aiPrompt}`;

    try {
      const res = await fetch('/api/gemini/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: corePrompt, modelChoice: 'pro' }) });
      const data = await res.json();
      if(res.ok) setAiResponse(data.response);
      else setAiResponse("Failed to connect to AI Coach.");
    } catch { setAiResponse("Network failure."); } finally { setIsAiThinking(false); }
  };

  if (isLoading) return <div className={styles.container} style={{textAlign:'center', marginTop:'4rem'}}>Aggregating Database...</div>;

  return (
    <div className={styles.container}>
      
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Topic Drilldown</h1>
        {availableTopics.length > 0 && (
          <div className={styles.topicSelectorWrapper}>
            <label>Filter by:</label>
            <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className={styles.selectBox}>
              {availableTopics.map(t => ( <option key={t} value={t}>{t}</option> ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.toggleContainer}>
         <button className={`${styles.toggleBtn} ${viewMode === 'combined' ? styles.active : ''}`} onClick={() => setViewMode('combined')}>Combined View</button>
         <button className={`${styles.toggleBtn} ${viewMode === 'split' ? styles.active : ''}`} onClick={() => setViewMode('split')}>Split View</button>
      </div>

      {chartData.length === 0 ? (
        <div style={{textAlign:'center', opacity:0.6}}>No data for this topic yet.</div>
      ) : (
        <div className={styles.chartBoard}>
           
           <div className={styles.statsRow}>
              <div className={styles.statBlock}><span className={styles.statLabel}>Avg Speed (mins)</span><span className={`${styles.statValue} ${styles.statValueSpeed}`}>{avgSpeed}</span></div>
              <div className={styles.statBlock}><span className={styles.statLabel}>Avg Attempts</span><span className={`${styles.statValue} ${styles.statValueAtt}`}>{avgAtt}</span></div>
              <div className={styles.statBlock}><span className={styles.statLabel}>Total Solved</span><span className={`${styles.statValue} ${styles.statValueVol}`}>{totalQ}</span></div>
           </div>

           {/* TRAJECTORY GRAPHS */}
           {viewMode === 'combined' ? (
             <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                  <XAxis dataKey="id" tickLine={false} axisLine={false} tick={{fill: '#888', fontSize: 12}} tickMargin={10} />
                  <YAxis yAxisId="time" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} tickMargin={15} />
                  <YAxis yAxisId="att" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} tickMargin={15} />
                  <Tooltip content={<CustomTooltip />} cursor={{stroke: '#888', strokeWidth: 1, strokeDasharray: '4 4'}} />
                  <Line yAxisId="time" name="Speed (Mins)" type="monotone" dataKey="Speed" stroke="#ff0080" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#ff0080', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#ff0080' }} />
                  <Line yAxisId="att" name="Attempts Needed" type="monotone" dataKey="Attempts" stroke="#7928ca" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#7928ca', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#7928ca' }} />
                </LineChart>
             </ResponsiveContainer>
           ) : (
             <div style={{display:'flex', flexDirection:'column', gap:'3rem'}}>
               <div>
                 <span className={styles.statLabel} style={{display:'block', marginBottom:'1rem'}}>Speed Trajectory (Mins)</span>
                 <ResponsiveContainer width="100%" height={180}>
                   <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                     <XAxis dataKey="id" tickLine={false} axisLine={false} tick={{fill: '#888', fontSize: 12}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                     <Tooltip content={<CustomTooltip />} cursor={{stroke: '#888'}} />
                     <Line type="monotone" dataKey="Speed" name="Speed (Mins)" stroke="#ff0080" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#ff0080', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
               
               <div>
                 <span className={styles.statLabel} style={{display:'block', marginBottom:'1rem'}}>Accuracy Trajectory (Attempts)</span>
                 <ResponsiveContainer width="100%" height={180}>
                   <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                     <XAxis dataKey="id" tickLine={false} axisLine={false} tick={{fill: '#888', fontSize: 12}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                     <Tooltip content={<CustomTooltip />} cursor={{stroke: '#888'}} />
                     <Line type="monotone" dataKey="Attempts" name="Attempts Needed" stroke="#7928ca" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#7928ca', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
           )}

           <div style={{display: 'flex', gap: '4rem', marginTop: '4rem', flexWrap: 'wrap'}}>
              
              {/* DIFFICULTY SPREAD BAR CHART */}
              <div style={{ flex: 1, minWidth: '300px', paddingTop: '3rem', borderTop: '2px dashed rgba(136, 136, 136, 0.2)' }}>
                 <span className={styles.statLabel} style={{display:'block', marginBottom:'1rem'}}>Average Time vs Difficulty Tier</span>
                 <p style={{fontSize: '0.9rem', color: '#888', marginBottom: '2rem'}}>Maps exactly how many minutes you average per question based on the rigorousness of the category (Mains, Adv, EX1, EX2).</p>
                 
                 <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={difficultyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                       <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill: '#888', fontSize: 12}} tickMargin={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} tickMargin={15} />
                       <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 0, 128, 0.05)'}} />
                       
                       <Bar dataKey="AvgSpeed" name="Avg Difficulty Speed (Mins)" radius={[6, 6, 0, 0]}>
                         {
                           difficultyData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={['#00d2ff', '#7928ca', '#ff0080', '#111'][index % 4]} />
                           ))
                         }
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>

              {/* CUMULATIVE VOLUME TIME GRAPH */}
              <div style={{ flex: 1, minWidth: '300px', paddingTop: '3rem', borderTop: '2px dashed rgba(136, 136, 136, 0.2)' }}>
                 <span className={styles.statLabel} style={{display:'block', marginBottom:'1rem'}}>Cumulative Growth (Volume vs Time)</span>
                 <p style={{fontSize: '0.9rem', color: '#888', marginBottom: '2rem'}}>Timeline tracking your cumulative total starting from the first recorded question solved in this topic.</p>
                 
                 <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs><linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d2ff" stopOpacity={0.6}/><stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/></linearGradient></defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                       <XAxis dataKey="dateStr" tickLine={false} axisLine={false} tick={{fill: '#888', fontSize: 12}} tickMargin={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} tickMargin={15} />
                       <Tooltip content={<CustomTooltip />} cursor={{stroke: '#888'}} />
                       <Area type="stepAfter" dataKey="Total" name="Cumulative Questions" stroke="#00d2ff" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" dot={{ r: 4, fill: '#fff', stroke: '#00d2ff', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#00d2ff' }} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           
           </div>
        </div>
      )}

      {/* AI COACH INTEGRATION */}
      <div className={styles.aiCoachCard}>
         <div className={styles.aiHeader}>
            <span style={{fontSize:'2.5rem'}}>🧠</span>
            <h2 className={styles.aiTitle}>Analyze the Trajectory</h2>
         </div>
         <p style={{marginBottom:'2rem', opacity:0.8}}>Gemini mathematically parses the array of chronological trajectory and difficulty metrics above. Query it to expose conceptual bottlenecks or map speed against exact difficulty brackets!</p>
         
         <div className={styles.aiInputArea}>
            <textarea className={styles.aiTextarea} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
            <button className={styles.aiSubmitBtn} onClick={handleConsultAI} disabled={isAiThinking || chartData.length === 0}>
               {isAiThinking ? 'Analyzing Trajectory Data...' : 'Scan Trajectory ✨'}
            </button>
         </div>

         {aiResponse && (
            <div className={`${styles.aiResponseBox} ${markdownStyles.markdownBody}`}><Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{aiResponse}</Markdown></div>
         )}
      </div>
    </div>
  );
}
