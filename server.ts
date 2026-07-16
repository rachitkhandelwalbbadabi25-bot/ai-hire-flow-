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

  app.get('/api/stripe/config', (req, res) => {
    res.json({ 
      configured: !!process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
    });
  });

  // Stripe Lazy Initialization
  let stripeClient: any = null;
  function getStripe() {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (key) {
        // Dynamic import / initialization to support clean startup if Stripe key is missing
        import('stripe').then(({ default: Stripe }) => {
          stripeClient = new Stripe(key);
        }).catch(err => {
          console.error('Failed to import Stripe:', err);
        });
      }
    }
    return stripeClient;
  }

  // Pre-try to setup stripe if key is present
  getStripe();

  // Create Stripe Checkout Session
  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    try {
      const { userId, type, item, price, credits, email } = req.body;
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        return res.json({ 
          error: 'Stripe API key is not configured on the server.',
          isSandbox: true 
        });
      }

      // Ensure Stripe is initialized
      if (!stripeClient) {
        const { default: Stripe } = await import('stripe');
        stripeClient = new Stripe(key);
      }

      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      let itemName = '';
      let itemDescription = '';
      const priceInPaise = Math.round(price * 100);

      if (type === 'subscription') {
        itemName = `Neural Career ${item === 'premium' ? 'Premium' : 'Standard'} Plan`;
        itemDescription = `${item === 'premium' ? '8000 credits/mo, personalized roadmap' : '2000 credits/mo, full roadmap'}`;
      } else {
        itemName = `${credits} Credits Pack`;
        itemDescription = `Neural Credit Wallet Top-up pack`;
      }

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email || undefined,
        line_items: [{
          price_data: {
            currency: 'inr',
            product_data: {
              name: itemName,
              description: itemDescription,
            },
            unit_amount: priceInPaise,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${appUrl}/credits?checkout_status=success&session_id={CHECKOUT_SESSION_ID}&type=${type}&item=${item}&credits=${credits}&price=${price}&uid=${userId}`,
        cancel_url: `${appUrl}/credits?checkout_status=cancel`,
        metadata: {
          userId,
          type,
          item,
          credits: String(credits),
          price: String(price),
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      console.error('Stripe session creation error:', err);
      res.status(500).json({ error: err.message || 'Failed to create Stripe Session' });
    }
  });

  // Verify Stripe Checkout Session
  app.post('/api/stripe/verify-session', async (req, res) => {
    try {
      const { sessionId, userId } = req.body;
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        return res.status(400).json({ error: 'Stripe is not configured in this workspace' });
      }

      if (!stripeClient) {
        const { default: Stripe } = await import('stripe');
        stripeClient = new Stripe(key);
      }

      const session = await stripeClient.checkout.sessions.retrieve(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Stripe Session not found' });
      }

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: 'Stripe Session has not been completed/paid' });
      }

      const metadata = session.metadata || {};
      if (metadata.userId !== userId) {
        return res.status(403).json({ error: 'Authorized session user ID mismatch' });
      }

      res.json({ 
        success: true, 
        type: metadata.type, 
        item: metadata.item, 
        credits: parseInt(metadata.credits || '0'), 
        price: parseFloat(metadata.price || '0') 
      });
    } catch (err: any) {
      console.error('Stripe verification error:', err);
      res.status(500).json({ error: err.message || 'Failed to verify Stripe payment' });
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
