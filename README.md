# ⚡️ AI HireFlow

> **An AI Career Operating System** — Crafted for professionals who refuse to settle. Precision engineered with minimalist glassmorphism, responsive micro-interactions, and integrated intelligence.

[![Built with React](https://img.shields.io/badge/Framework-React%2019-09090B?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Styled with Tailwind](https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-09090B?style=flat&logo=tailwindcss&logoColor=38BDF8)](https://tailwindcss.com/)
[![Powered by Gemini](https://img.shields.io/badge/AI%20Engine-Gemini%203.5-09090B?style=flat&logo=google&logoColor=7C3AED)](https://ai.google.dev/)
[![Database Firestore](https://img.shields.io/badge/Database-Firestore-09090B?style=flat&logo=firebase&logoColor=FFCA28)](https://firebase.google.com/)

---

## 💎 Design Philosophy

AI HireFlow rejects the typical "AI Slop" of generic, over-gradiented dashboards. Instead, it is inspired by the meticulous craftsmanship of **Apple, Linear, Stripe, and Vercel**:

*   **Atmospheric "Calm Twilight" Dark Canvas**: Styled on `#09090B` backgrounds with deep `#111217` panels, subtle custom border accents (`rgba(255, 255, 255, 0.06)`), and heavy glassmorphic blurs (`backdrop-blur-xl`).
*   **Perfect Typographic Rhythm**: Handcrafted layouts featuring beautiful typography pairing, generous line spacing, and stark visual contrast that highlights what matters.
*   **Intentional Interactions**: Fluid transitions powered by `motion` that guide the eyes without overwhelming. Micro-states, subtle element scale changes, and custom hover states that feel "alive."
*   **No Technical Larping**: Zero useless logs, status lines, or simulated terminal noise. The user is treated to clean, actionable screens built for human productivity.

---

## 🌌 Core Modules & Intelligence Layer

AI HireFlow embeds custom-trained Gemini intelligence directly into every workflows:

1.  **Dashboard (`/dashboard`)**
    *   *The "What's Next?" Feed:* Instead of static widgets, you receive immediate, personalized career progress, AI Recommendations, current resume metrics, and upcoming milestones.
2.  **Resume Analyzer (`/analyzer`)**
    *   *Split-Screen Audit:* Upload your resume alongside target job descriptions to calculate live ATS scores, discover critical skill gaps, and view custom action plans side-by-side.
3.  **Resume Editor (`/editor`)**
    *   *AI-Powered Redraft:* Seamless inline text refactoring optimized for maximum impact and metrics-based bullet phrasing.
4.  **Job Finder (`/finder`)**
    *   *Neural Crawler:* Live web search and listing extraction with built-in Google Grounding. Displays custom "AI Match" insights for each role.
5.  **Application Tracker (`/jobs`)**
    *   *Elite Kanban:* Beautiful drag-and-drop workflow tracking opportunities from *Applied* to *Interview*, *Offer*, or *Archived*.
6.  **Interview Simulator (`/interview`)**
    *   *Real-time Practice Room:* High-fidelity environment with randomized questions, timers, voice prompts, and granular metrics-based AI performance evaluation.
7.  **Learning Roadmaps (`/learning`)**
    *   *Interactive Timeline:* Personalized, step-by-step career acceleration pathways mapping your custom learning milestones.
8.  **Campus Preparation (`/campus`)**
    *   *MNC Drills:* Highly targeted aptitude and technical drilling modules optimized for competitive placement pipelines.
9.  **Outreach Hub (`/outreach`)**
    *   *Hyper-personalized Pitching:* AI-driven cold email, LinkedIn connection request, and referral template writer built for response rate optimization.

---

## 🛠️ Technology Stack

*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (v4)
*   **Animations**: Motion (`motion/react`)
*   **Visualizations**: Recharts, Lucide Icons
*   **Database & Auth**: Firebase Auth, Cloud Firestore
*   **AI Engine**: Google Gen AI SDK (`@google/genai`) on Express server proxy

---

## 🚀 Local Installation & Setup

Get AI HireFlow running locally in less than 3 minutes:

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/ai-hireflow.git
cd ai-hireflow
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎨 Design System Guide

AI HireFlow enforces consistent, designer-grade variables globally in `src/index.css`:

```css
:root {
  --background: #08080A;
  --surface: #111116;
  --surface-light: #1A1A22;
  --ink: #FFFFFF;
  --ink-dim: #94949E;
  --border: rgba(255, 255, 255, 0.06);
}

/* Glassmorphic Utilities */
.glass-card {
  background: rgba(17, 17, 22, 0.60);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

<p align="center">
  Precision engineered for students and professionals chasing elite placements.
</p>
