"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './search.module.css';

export default function SearchPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/questions');
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        setQuestions(data);
      } catch (error) {
        console.error("Failed to load questions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleCardClick = (id) => {
     if(id) {
       router.push(`/question/${id}`);
     }
  };

  const toggleTopicFilter = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Derive unique topics dynamically from the dataset to use as checkboxes
  const uniqueTopics = [...new Set(questions.map(q => q.topic))].sort((a, b) => a.localeCompare(b));

  // The Magic Search Logic
  const filteredQuestions = questions.filter(q => {
    const query = searchQuery.toLowerCase();
    
    // 1. Text Search (Matches Name OR Topic OR Summary)
    const matchesSearch = 
      q.name.toLowerCase().includes(query) ||
      q.topic.toLowerCase().includes(query) ||
      q.summary.toLowerCase().includes(query);
      
    // 2. Topic Filter (Matches if no filters selected, OR if question topic is in selected triggers)
    const matchesTopicFilter = selectedTopics.length === 0 || selectedTopics.includes(q.topic);
    
    return matchesSearch && matchesTopicFilter;
  });

  return (
    <div className={styles.container}>
      
      <div className={styles.searchHeader}>
        <h1 className={styles.title}>Global Search</h1>
        
        {/* BIG SEARCH BAR */}
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input 
            type="text" 
            className={styles.searchInput}
            placeholder="Type anywhere in question name, summary, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* TOPIC FILTERS */}
        {uniqueTopics.length > 0 && (
          <div className={styles.filtersWrapper}>
            <span className={styles.filterLabel}>Refine by Topics:</span>
            <div className={styles.pillsContainer}>
              {uniqueTopics.map(topic => (
                <button 
                  key={topic} 
                  className={`${styles.pill} ${selectedTopics.includes(topic) ? styles.active : ''}`}
                  onClick={() => toggleTopicFilter(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>Booting Search Engine...</div>
      ) : (
        <>
          <div className={styles.statusText}>
            Showing {filteredQuestions.length} result{filteredQuestions.length === 1 ? '' : 's'}
          </div>

          <div className={styles.grid}>
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map(q => (
                <div 
                  key={q._id || q.name} 
                  className={styles.card}
                  onClick={() => handleCardClick(q._id)}
                >
                  <h3 className={styles.cardName}>{q.name}</h3>
                  <div className={styles.cardMeta}>
                    <span className={styles.tagTopic}>{q.topic}</span>
                    <span className={styles.tagTime}>⏱ {q.time || 'N/A'}</span>
                  </div>
                  <p className={styles.cardSummary}>{q.summary}</p>
                </div>
              ))
            ) : (
              <div className={styles.emptyState} style={{gridColumn: '1 / -1'}}>
                No questions match your exact search and filter criteria. Try broadening your terms!
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
