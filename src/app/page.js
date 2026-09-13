"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const quotes = [
  "“The only way to do great work is to love what you do.” - Steve Jobs",
  "“Success is not final, failure is not fatal: it is the courage to continue that counts.” - Winston Churchill",
  "“Believe you can and you're halfway there.” - Theodore Roosevelt",
];

export default function Home() {
  const [quote, setQuote] = useState("");
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentPeriod = Math.floor(Date.now() / 43200000);
    setQuote(quotes[currentPeriod % quotes.length]);

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

  return (
    <main className={styles.main}>
      <div className={styles.heroSection}>
        <h1 className={styles.appName}>Question Bank</h1>
        <p className={styles.quote}>{quote || "Loading inspiration..."}</p>
      </div>

      <div className={styles.gridContainer}>
        <h2 className={styles.sectionTitle}>Recently Solved</h2>
        <div className={styles.grid}>
          {isLoading ? (
             <div className={styles.emptyState}>Loading your questions...</div>
          ) : questions.length > 0 ? (
            questions.map((q) => (
              <Link href={`/question/${q._id}`} key={q._id || q.name} className={styles.card} style={{textDecoration: 'none', color: 'inherit'}}>
                <h3 className={styles.cardName}>{q.name}</h3>
                <div className={styles.cardMeta}>
                  <span className={styles.tagTopic}>{q.topic}</span>
                  <span className={styles.tagTime}>⏱ {q.time}</span>
                </div>
                <p className={styles.cardSummary}>{q.summary}</p>
              </Link>
            ))
          ) : (
            <div className={styles.emptyState}>
              <p>No questions found in the database.</p>
              <Link href="/upload" style={{ color: '#00d2ff', textDecoration: 'underline' }}>Upload your first Q&A!</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
