import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import postgres from 'postgres';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { createContext } from './context';
import { initializeConnectors } from './init';
import { startTrendingKeywordsCron } from './cron/trending-keywords';
import { startGscSyncCron } from './cron/gsc-sync';
import { imageRouter } from './routes/images';
import { authRouter } from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || process.env.APP_PUBLIC_URL || 'http://localhost:3000',
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
app.use('/api/auth', authRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`🚀 API server listening on http://localhost:${PORT}`);
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
  
  // Database Admin setup for Temporal and deseo user CREATEDB privilege
  try {
    const adminUrl = process.env.DATABASE_ADMIN_URL as string;
    console.log('🔑 Connecting to database as superuser to verify/grant permissions...');
    const sqlClient = postgres(adminUrl);
    
    // Grant CREATEDB to deseo
    await sqlClient`ALTER USER deseo CREATEDB`;
    console.log('✅ Altered user deseo: CREATEDB granted');

    // Make sure temporal databases are owned by deseo (if they exist)
    try {
      await sqlClient`ALTER DATABASE temporal OWNER TO deseo`;
      console.log('✅ Altered database temporal: Owner set to deseo');
    } catch (e: any) {
      console.log('ℹ️ Database "temporal" did not exist or could not be altered:', e?.message || e);
    }
    
    try {
      await sqlClient`ALTER DATABASE temporal_visibility OWNER TO deseo`;
      console.log('✅ Altered database temporal_visibility: Owner set to deseo');
    } catch (e: any) {
      console.log('ℹ️ Database "temporal_visibility" did not exist or could not be altered:', e?.message || e);
    }

    await sqlClient.end();
  } catch (err: any) {
    console.error('❌ Database Admin setup failed:', err?.message || err);
  }

  try {
    await initializeConnectors();
  } catch (error) {
    console.error('❌ Failed to initialize connectors:', error);
  }

  // Start background cron jobs
  startTrendingKeywordsCron();
  startGscSyncCron();
});

