import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';
import express from 'express';
import apiApp from './api/_index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = 3000;
  const app = apiApp;

  const seoPageMap: Record<string, string> = {
    '/resume-analyzer': 'resume-analyzer.html',
    '/resume-editor': 'resume-editor.html',
    '/job-finder': 'job-finder.html',
    '/job-tracker': 'job-tracker.html',
    '/career-advisor': 'career-advisor.html',
    '/interview-lab': 'interview-lab.html',
    '/ats-resume-checker': 'resume-analyzer.html',
    '/resume-builder': 'resume-editor.html',
    '/ai-job-search': 'job-finder.html',
    '/career-roadmap': 'career-advisor.html',
    '/ai-interview-preparation': 'interview-lab.html'
  };

  // Client serving (Vite in dev, Static in prod)
  const distPath = path.join(process.cwd(), 'dist');

  // Intercept public SEO routes to serve pre-rendered HTML with exact canonical and JSON-LD
  app.get([
    '/resume-analyzer', '/resume-editor', '/job-finder', '/job-tracker', '/career-advisor', '/interview-lab',
    '/ats-resume-checker', '/resume-builder', '/ai-job-search', '/career-roadmap', '/ai-interview-preparation'
  ], (req, res, next) => {
    const cleanPath = req.path.replace(/\/+$/, '') || '/';
    const targetHtml = seoPageMap[cleanPath];
    if (targetHtml) {
      const filePath = path.join(distPath, targetHtml);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const cleanPath = req.path.replace(/\/+$/, '') || '/';
      const targetHtml = seoPageMap[cleanPath];
      if (targetHtml) {
        const filePath = path.join(distPath, targetHtml);
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        }
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Failed to start server:', err);
  process.exit(1);
});
