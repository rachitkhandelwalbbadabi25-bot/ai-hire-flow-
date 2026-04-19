export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const viteKey = (process.env as any).VITE_GEMINI_API_KEY;
  const activeKey = geminiKey || viteKey;

  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: {
      apiKeyExists: !!activeKey,
      usingVitePrefix: !geminiKey && !!viteKey,
      apiKeyPreview: activeKey ? `${activeKey.trim().slice(0, 3)}...${activeKey.trim().slice(-3)}` : 'none',
      nodeVersion: process.version
    }
  });
}
