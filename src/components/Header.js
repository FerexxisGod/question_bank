"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') setIsDarkMode(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">Question Bank</Link>
      </div>
      
      <nav className={styles.nav}>
        <Link href="/upload" className={styles.navLink}>Upload Q&A</Link>
        <Link href="/search" className={styles.navLink}>Search for question</Link>
        <Link href="/topics" className={styles.navLink}>Topics</Link>
        <Link href="/focus-room" className={styles.navLink}>Focus room</Link>
        <Link href="/statistics" className={styles.navLink}>Statistics</Link>
      </nav>

      <div className={styles.rightSection}>
        {mounted && (
          <label className={styles.switch} aria-label="Toggle Dark Mode">
            <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
            <span className={styles.slider}></span>
          </label>
        )}
        
        {/* NEW ACCOUNT BADGE */}
        <div className={styles.accountBadge} onClick={() => window.dispatchEvent(new Event('openKeyVault'))} title="Manage API Keys">
           <div className={styles.accountAvatar}>A</div>
        </div>
      </div>
    </header>
  );
}
