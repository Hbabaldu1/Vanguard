import express, { Express } from 'express';
import { getDatabase } from './db/database.js';
import { createApiRouter } from './routes/api.js';

let cachedApp: Express | null = null;

export async function getApp(): Promise<Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = express();
  app.use(express.json());

  // CORS middleware allowing frontend requests from anywhere or custom domains
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  const db = await getDatabase();

  // Mount API router
  app.use('/api', createApiRouter(db));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Vanguard Opportunity Intelligence Platform',
      environment: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
      timestamp: new Date().toISOString()
    });
  });

  cachedApp = app;
  return app;
}
