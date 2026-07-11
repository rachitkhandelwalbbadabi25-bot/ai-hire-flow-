import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// AI Coach route (to support server-side proxying in the future if needed)
app.post('/api/coach', (req, res) => {
  res.json({ status: 'active', message: 'Ready' });
});

export default app;
