import express from 'express';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for local dev
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

  app.get('/api/razorpay/config', (req, res) => {
    res.json({ 
      configured: !!process.env.RAZORPAY_KEY_ID,
      keyId: process.env.RAZORPAY_KEY_ID || ''
    });
  });

  // Razorpay Lazy Initialization
  let razorpayClient: any = null;
  async function getRazorpay() {
    if (!razorpayClient) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (keyId && keySecret) {
        try {
          const { default: Razorpay } = await import('razorpay');
          razorpayClient = new Razorpay({
            key_id: keyId,
            key_secret: keySecret
          });
        } catch (err) {
          console.error('Failed to initialize Razorpay:', err);
        }
      }
    }
    return razorpayClient;
  }

  // Create Razorpay Order
  app.post(['/api/razorpay/create-order', '/api/create-order'], async (req, res) => {
    try {
      const { amount, currency, receipt, userId, type, item, price, credits } = req.body;
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return res.json({ 
          error: 'Razorpay API keys are not configured on the server.',
          isSandbox: true 
        });
      }

      // Ensure Razorpay client is initialized
      const client = await getRazorpay();
      if (!client) {
        return res.status(500).json({ error: 'Failed to initialize Razorpay client' });
      }

      // Determine amount in paise
      let amountInPaisa = 0;
      if (amount !== undefined) {
        amountInPaisa = Math.round(Number(amount));
      } else if (price !== undefined) {
        amountInPaisa = Math.round(Number(price) * 100);
      } else {
        return res.status(400).json({ error: 'Amount in paise or price in rupees is required.' });
      }

      if (amountInPaisa < 100) {
        return res.status(400).json({ error: 'Minimum amount must be 100 paise (₹1).' });
      }

      const options = {
        amount: amountInPaisa,
        currency: currency || 'INR',
        receipt: receipt || `rcpt_${(userId || 'guest').substring(0, 5)}_${Date.now().toString().slice(-6)}`,
        notes: {
          userId: userId || 'guest',
          type: type || 'custom',
          item: item || 'custom_item',
          credits: String(credits || '0'),
          price: String(price || (amountInPaisa / 100))
        }
      };

      const order = await client.orders.create(options);
      res.json({ 
        orderId: order.id, 
        amount: order.amount, 
        currency: order.currency, 
        keyId 
      });
    } catch (err: any) {
      console.error('Razorpay order creation error:', err);
      res.status(500).json({ error: err.message || 'Failed to create Razorpay Order' });
    }
  });

  // Verify Razorpay Signature
  app.post(['/api/razorpay/verify-payment', '/api/verify-payment'], async (req, res) => {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        userId,
        type,
        item,
        credits,
        price
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing required validation fields' });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return res.status(400).json({ error: 'Razorpay is not configured on this server' });
      }

      const crypto = await import('crypto');
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: 'Cryptographic signature verification failed' });
      }

      res.json({ 
        success: true, 
        type: type || 'custom', 
        item: item || 'custom_item', 
        credits: parseInt(credits || '0'), 
        price: parseFloat(price || '0') 
      });
    } catch (err: any) {
      console.error('Razorpay signature verification error:', err);
      res.status(500).json({ error: err.message || 'Failed to verify payment signature' });
    }
  });

  // Client serving (Vite in dev, Static in prod)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
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
