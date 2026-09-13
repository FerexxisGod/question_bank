# 📚 Agentic AI Question Bank

A highly-scalable, Next.js powered learning platform that acts as your personal study vault and AI Coach. 
This application enables you to scan physical problems (using Google Gemini Vision), extract their statistics, track your trajectory over time via Monkeytype-style chronological metrics, and isolate study habits.

## 🚀 Features

* **AI Bulk Extraction Engine**: Upload images of homework/tests, and Gemini will automatically structure, title, and categorize them into your database.
* **Focus Room (Zen Mode)**: A zero-distraction csTimer-style workspace where you can grind out questions against a live clock to monitor your speed and accuracy metrics.
* **Chronological Mastery Tracking**: The `/statistics` board breaks down your performance trajectory based on difficulty *(JEE Mains, JEE Advance, EX1, EX2)* and traces your conceptual tipping-points on live Area / Line graphs over pure physical time.
* **Personal Gemini Study Coach**: Select any topic in your vault and instantly consult an embedded Google Gemini Agent that maps out your actual chronological performance curves and tells you exactly what to study computationally.

---

## 🔒 Bring-Your-Own-Keys (BYOK) Architecture

This application was intentionally architected for **zero-cost public multi-tenant Cloud deployment (e.g. Vercel / Netlify)**. 

It does not rely on hardcoded `.env.local` server files. Instead, it features an absolute **KeyVault Blackout Barrier**:
1. When a user navigates to the URL, they are halted by an interactive React Vault demanding their own personal **MongoDB Connection String** and **Gemini API Key**.
2. The user's keys are encrypted *exclusively* to the HTML5 `sessionStorage` in their browser and injected seamlessly into Javascript's native `window.fetch()` method.
3. The server spins up hyper-isolated database connection pools exclusively for that user's specific request using the headers passed.
4. **Absolute Privacy**: The split second a user minimizes or closes the tab, the keys self-destruct from the browser's memory.

---

## 💻 How to setup your own instance:

### Step 1: Clone & Install
```bash
git clone https://github.com/your-username/question-bank.git
cd question-bank
npm install
npm install recharts --legacy-peer-deps
```

### Step 2: Grab free API Keys
You will need exactly two things to operate the Vault:
1. **Google Gemini API Key:** (Generates your AI metrics and image extraction for free).
   * Get it at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. **MongoDB Connection String:** (This is where your questions and timing metrics get safely saved, 100% free via standard Atlas).
   * Get it at [MongoDB Cloud](https://www.mongodb.com/cloud/atlas/register). Remember to whitelist your `IP Address` and replace `<password>` with your database user password! (Looks like: `mongodb+srv://user:password@cluster...`)

### Step 3: Run the Matrix
```bash
npm run dev
```

Navigate to `http://localhost:3000` in your web browser. Paste the raw keys (no quotes) into the graphical vault screen to unlock the application! 

> **Important**: This application caches physical image/markdown uploads directly into the Next.js `public/uploads` directory to save MongoDB memory. 
