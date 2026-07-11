# AI HireFlow

**AI Resume & Job Tracker — a full-stack, AI-driven career acceleration cockpit**

AI HireFlow integrates real-time intelligence to analyze resumes, track job pipelines, simulate interviews, design curated learning curriculums, and automate professional outreach — all wrapped in a handcrafted **Glassmorphic Slate** theme.

[![Live Demo](https://img.shields.io/badge/demo-live-4F46E5?style=for-the-badge)](https://ai-hire-flow.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Firebase](https://img.shields.io/badge/Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](#license)

**[Live Demo →](https://ai-hire-flow.vercel.app)**

---

## Screenshots

> Add screenshots or a short GIF walkthrough here — dashboard, kanban tracker, and resume analyzer are the strongest first impressions.

```
docs/screenshots/dashboard.png
docs/screenshots/kanban.png
docs/screenshots/analyzer.png
```

---

## Key Features

| Module | What it does |
|---|---|
| 📊 **Integrated Career Dashboard** | Glassmorphic command center aggregating pipeline metrics, active application statuses, upcoming interviews, and AI-recommended next actions |
| 🔍 **Neural Resume Analyzer** | Server-side Gemini intelligence performs instant, multi-point reviews of CV alignment, formatting, impact metrics, and keyword density |
| 📝 **Interactive Resume Editor** | Build and refine resumes with inline, context-sensitive AI assistance and live structural polishing |
| 💼 **Intelligent Job Finder & Tracker** | Real-time job discovery with a visual Kanban pipeline board to track progress |
| 🗣️ **Mock Interview Simulator** | Immersive technical and behavioral simulation with instant performance feedback and score breakdowns |
| 📚 **Custom Learning Paths** | Maps out industry-standard curriculums and milestones to bridge skill gaps for target roles |
| ✉️ **Professional Outreach Hub** | Automates personalized referral scripts, templates, and follow-up tracking |
| 🏫 **Campus Placement Drill** | Specialized MNC recruitment prep, technical drills, and service-sector mock challenges |
| 💻 **CodeRabbit Sandbox** | Real-time playground to test, refactor, and review code with immediate AI diagnostics |

---

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS (custom glassmorphism utilities), Framer Motion

**Backend & Orchestration:** Node.js, Express, TypeScript, server-side Google GenAI SDK (Gemini)

**Persistence:** Firestore (Firebase)

**Deployment:** Vercel (serverless functions via `/api`)

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Google AI Studio / Gemini API key
- A Firebase project with Firestore enabled

### Installation

```bash
git clone https://github.com/<your-username>/ai-hire-flow.git
cd ai-hire-flow
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
```

> On Vercel, add the same keys under **Project Settings → Environment Variables**, then redeploy so the serverless functions can read them at build/runtime.

### Run locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

### Build for production

```bash
npm run build
```

---

## Deployment

This project deploys to **Vercel**. The `/api` directory contains the serverless Express entry point (`api/index.ts`), configured in `vercel.json`:

```json
{
  "version": 2,
  "functions": {
    "api/index.ts": { "maxDuration": 30 }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Push to your connected GitHub repository and Vercel will auto-deploy on every commit to `main`.

---

## Project Structure

```
ai-hire-flow/
├── api/                  # Vercel serverless functions (Express)
│   └── index.ts
├── src/
│   ├── components/       # UI components
│   ├── pages/             # Dashboard, Analyzer, Finder, Editor, etc.
│   ├── lib/                # gemini.ts and other service integrations
│   └── firestore.rules
├── public/
│   └── robots.txt
├── vercel.json
├── vite.config.ts
└── package.json
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Author

**Rachit Khandelwal**
[LinkedIn](https://linkedin.com/in/rachit-khandelwal-ab0b78359) · [@ai.walabhai](https://instagram.com/ai.walabhai)
