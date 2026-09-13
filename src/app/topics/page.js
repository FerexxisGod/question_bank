"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './topics.module.css';

export default function TopicsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [groupedTopics, setGroupedTopics] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/questions');
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        setQuestions(data);
        
        // Group questions by topic 
        const groups = data.reduce((acc, q) => {
          if (!acc[q.topic]) acc[q.topic] = [];
          acc[q.topic].push(q);
          return acc;
        }, {});

        setGroupedTopics(groups);
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

  const topicNames = Object.keys(groupedTopics).sort((a, b) => a.localeCompare(b));

  if (isLoading) {
    return <div className={styles.container}><div className={styles.emptyState}>Loading your topics...</div></div>;
  }

  if (topicNames.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Your Topics</h1>
        <div className={styles.emptyState}>
          <p>You haven't uploaded any questions yet!</p>
          <Link href="/upload" style={{ color: '#ff0080', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
            Go to Upload Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {!selectedTopic ? (
        <>
          <h1 className={styles.title}>Explore by Topic</h1>
          <div className={styles.topicGrid}>
            {topicNames.map((topic) => (
              <div 
                key={topic} 
                className={styles.topicCard} 
                onClick={() => setSelectedTopic(topic)}
              >
                <h2 className={styles.topicName}>{topic}</h2>
                <div className={styles.topicCount}>
                  {groupedTopics[topic].length} {groupedTopics[topic].length === 1 ? 'Question' : 'Questions'}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className={styles.backHeader}>
            <button 
              className={styles.backBtn} 
              onClick={() => setSelectedTopic(null)}
              aria-label="Back to topics"
            >
              ←
            </button>
            <h1 className={styles.selectedTopicTitle}>{selectedTopic}</h1>
          </div>
          
          <div className={styles.questionGrid}>
            {groupedTopics[selectedTopic].map((q) => (
              <div 
                key={q._id || q.name} 
                className={styles.card}
                onClick={() => handleCardClick(q._id)}
                style={{ cursor: 'pointer' }}
              >
                <h3 className={styles.cardName}>{q.name}</h3>
                <div className={styles.cardMeta}>
                  <span className={styles.tagTime}>⏱ {q.time || 'N/A'}</span>
                </div>
                <p className={styles.cardSummary}>{q.summary}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
