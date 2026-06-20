import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { createContext } from './context';
import { initializeConnectors } from './init';
import { startTrendingKeywordsCron } from './cron/trending-keywords';
import { imageRouter } from './routes/images';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.use('/api/images', imageRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`🚀 API server listening on http://localhost:${PORT}`);
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
  
  try {
    await initializeConnectors();
  } catch (error) {
    console.error('❌ Failed to initialize connectors:', error);
  }

  // Start background cron jobs
  startTrendingKeywordsCron();
});

