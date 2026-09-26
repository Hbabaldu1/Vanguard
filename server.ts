import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { getApp } from './server/app.js';
import { getDatabase } from './server/db/database.js';
import { initScheduler } from './server/pipeline/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = await getApp();
  const port = Number(process.env.PORT) || 3000;

  // Initialize scheduler for persistent Node server runtimes
  if (!process.env.VERCEL) {
    const db = await getDatabase();
    initScheduler(db);
  }

  // Serve Frontend
  const distPath = path.resolve(__dirname, 'dist');
  const indexPath = path.join(distPath, 'index.html');

  if (process.env.NODE_ENV === 'production' && fs.existsSync(indexPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Server] dist/index.html not found, mounting Vite middleware dynamically');
    }
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Opportunity Intelligence Platform live at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
