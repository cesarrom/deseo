import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

console.log(`🔌 [GSC] Initializing with DATABASE_URL: ${process.env.DATABASE_URL?.split('@').pop()}`);

import express from 'express';
import cors from 'cors';

import axios from 'axios';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import { db } from '../db';
import { gscTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ConnectorSDK } from '@deseo/connector-sdk';

/** Strip GSC-specific prefixes so the core always sees a clean hostname. */
function normalizeGscDomain(siteUrl: string): string {
  return siteUrl
    .replace(/^sc-domain:/, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

/**
 * Reconstruct the GSC-native site URL from a clean domain.
 * Domain properties use sc-domain:, URL-prefix properties use https://.
 * We try sc-domain: first (most common modern registration). If GSC rejects
 * it, the caller falls back to the https:// variant automatically.
 */
function toGscSiteUrl(domain: string): string {
  if (domain.startsWith('sc-domain:') || domain.startsWith('http')) return domain;
  return `sc-domain:${domain}`;
}

const sdk = new ConnectorSDK(process.env.DESEO_CLIENT_SECRET!);
const app = express();
const PORT = process.env.PORT || 3003;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';
const baseUrl = (process.env.BASE_URL || process.env.CONNECTOR_GSC_BASE_URL || '').replace(/\/$/, '');
const redirectUrl = process.env.GOOGLE_REDIRECT_URL || (baseUrl ? `${baseUrl}/api/auth/google/callback` : 'http://localhost:3003/api/auth/google/callback');

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUrl,
);

// 1. The Configuration UI (Handshake Entrypoint from Hub)
app.get('/ui/configure', async (req, res) => {
  const { code } = req.query;
  console.log('🏁 [GSC] Handshake started with code:', code);

  if (!code) return res.status(400).send('Missing authorization code');

  try {
    console.log('📡 [GSC] Exchanging code for Deseo Identity at:', HUB_URL);
    // Exchange code for Deseo Identity
    const response = await axios.post(`${HUB_URL}/registry.exchangeCode`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        code: code as string,
      }
    });

    const { userId, installationId } = response.data.result.data.json;
    console.log('✅ [GSC] Handshake successful. User:', userId, 'Installation:', installationId);

    res.cookie('deseo_user_id', userId, { httpOnly: true, maxAge: 600000 });
    res.cookie('deseo_installation_id', installationId, { httpOnly: true, maxAge: 600000 });

    // Generate Google Auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: (process.env.GOOGLE_SCOPES || "").split(","),
      prompt: 'consent'
    });

    console.log({ authUrl });

    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>Connect Google Search Console</h1>
          <p>Deseo User: <code>${userId}</code></p>
          <a href="${authUrl}" 
             style="padding: 12px 24px; background: #4285F4; color: white; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Authorize Google Access
          </a>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ [GSC] Identity exchange failed:', error.response?.data || error.message);
    res.status(500).send('Deseo Identity exchange failed');
  }
});

// 2. Google OAuth Callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  const deseoUserId = req.cookies['deseo_user_id'];
  const installationId = req.cookies['deseo_installation_id'];

  console.log('🔄 [GSC] OAuth callback received. Code present:', !!code);

  if (!code || !deseoUserId || !installationId) {
    console.error('❌ [GSC] Session expired or missing code:', { hasCode: !!code, hasUser: !!deseoUserId, hasInst: !!installationId });
    return res.status(400).send('Session expired or missing code');
  }

  try {
    console.log('📡 [GSC] Exchanging Google code for tokens...');
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Store tokens in DB
    await db.insert(gscTokens).values({
      deseoUserId,
      tokens,
    }).onConflictDoUpdate({
      target: gscTokens.deseoUserId,
      set: { tokens, updatedAt: new Date() }
    });

    console.log('✅ [GSC] Tokens obtained. Linking to user:', deseoUserId);

    // Push 'active' status back to Deseo Hub
    console.log('📡 [GSC] Pushing ACTIVE status to Hub for installation:', installationId);
    await axios.post(`${HUB_URL}/registry.updateInstallationStatus`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        installationId,
        status: 'active'
      }
    });

    console.log('🎊 [GSC] Connection complete!');
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>✅ GSC Connected!</h1>
          <p>Deseo can now analyze your search performance.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'DESEO_INSTALL_COMPLETE', app: 'gsc' }, '*');
            }
          </script>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ [GSC] Authorization failed:', error.response?.data || error.message);
    res.status(500).send('Google Authorization failed');
  }
});

// 3. GSC Provider Action: List Sites
app.get('/api/feature/analytics/sites', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);

  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    const response = await searchconsole.sites.list({});
    const sites = (response.data.siteEntry ?? []).map((s: any) => ({
      ...s,
      siteUrl: normalizeGscDomain(s.siteUrl ?? ''),
    }));

    res.json({ success: true, data: sites });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GSC Provider Action: Fetch Performance
app.post('/api/feature/analytics/performance', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { siteUrl: rawSiteUrl, startDate, endDate } = req.body;
  const siteUrl = toGscSiteUrl(rawSiteUrl);
  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);

  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 100
      }
    });

    res.json({ success: true, data: response.data.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. GSC Provider Action: Deep Sync Keywords
app.post('/api/feature/analytics/sync', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { siteUrl: rawSiteUrl, startDate, endDate } = req.body;
  const siteUrl = toGscSiteUrl(rawSiteUrl);
  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);

  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date', 'query'],
        rowLimit: 5000
      }
    });

    const rows = response.data.rows || [];
    const keywords = rows.map((r: any) => ({
      query: r.keys[1],
      date: r.keys[0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      position: r.position || 0,
      ctr: r.ctr || 0
    }));

    res.json({ success: true, data: keywords });
  } catch (error: any) {
    console.error('❌ [GSC] Sync failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. GSC Provider Action: List Top Pages
app.post('/api/feature/analytics/pages', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { siteUrl: rawSiteUrl, startDate, endDate } = req.body;
  const siteUrl = toGscSiteUrl(rawSiteUrl);
  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);

  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 50
      }
    });

    const pages = (response.data.rows || []).map(r => ({
      url: r.keys![0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0
    }));

    res.json({ success: true, data: pages });
  } catch (error: any) {
    console.error('❌ [GSC] Pages fetch failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. GSC Provider Action: Dashboard Data
app.get('/api/feature/analytics/dashboard', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const siteUrl = toGscSiteUrl(req.query.siteUrl as string);
  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);

  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!siteUrl) return res.status(400).json({ success: false, error: 'Site URL is required' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDateStr,
        endDate,
        dimensions: ['date', 'query'],
        rowLimit: 1000
      }
    });

    const rows = response.data.rows || [];
    
    // Calculate summary
    const summary = rows.reduce((acc, row) => ({
      totalClicks: acc.totalClicks + (row.clicks || 0),
      totalImpressions: acc.totalImpressions + (row.impressions || 0),
      averagePosition: acc.averagePosition + (row.position || 0),
      averageCTR: acc.averageCTR + (row.ctr || 0)
    }), { totalClicks: 0, totalImpressions: 0, averagePosition: 0, averageCTR: 0 });

    if (rows.length > 0) {
      summary.averagePosition /= rows.length;
      summary.averageCTR /= rows.length;
    }

    // Top Keywords
    const topKeywords = rows
      .filter(r => r.keys && r.keys.length > 1) // rows with query dimension
      .slice(0, 10)
      .map(r => ({
        query: r.keys![1],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        position: r.position || 0,
        ctr: r.ctr || 0
      }));

    // Trend
    const trendMap = new Map<string, { clicks: number; impressions: number }>();
    rows.forEach(r => {
      const date = r.keys![0];
      const current = trendMap.get(date) || { clicks: 0, impressions: 0 };
      trendMap.set(date, {
        clicks: current.clicks + (r.clicks || 0),
        impressions: current.impressions + (r.impressions || 0)
      });
    });

    const trend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        summary,
        topKeywords,
        trend
      }
    });
  } catch (error: any) {
    console.error('GSC Dashboard failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. List submitted sitemaps for a site
app.get('/api/feature/analytics/sitemaps', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const rawSiteUrl = req.query.siteUrl as string;
  if (!rawSiteUrl) return res.status(400).json({ success: false, error: 'siteUrl is required' });

  const siteUrl = toGscSiteUrl(rawSiteUrl);
  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);
  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const response = await searchconsole.sitemaps.list({ siteUrl });
    res.json({ success: true, data: response.data.sitemap ?? [] });
  } catch (error: any) {
    const needsReauth = error.code === 403 || error.status === 403;
    res.status(needsReauth ? 403 : 500).json({
      success: false,
      error: needsReauth ? 'Insufficient permissions — please reconnect GSC with updated scopes.' : error.message,
    });
  }
});

// 9. Submit (or resubmit) a sitemap for a site
app.post('/api/feature/analytics/sitemaps/submit', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { siteUrl: rawSiteUrl, feedpath } = req.body as { siteUrl: string; feedpath: string };

  if (!rawSiteUrl || !feedpath) {
    return res.status(400).json({ success: false, error: 'siteUrl and feedpath are required' });
  }

  const siteUrl = toGscSiteUrl(rawSiteUrl);
  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);
  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    await searchconsole.sitemaps.submit({ siteUrl, feedpath });
    res.json({ success: true, data: { siteUrl: normalizeGscDomain(siteUrl), feedpath } });
  } catch (error: any) {
    const needsReauth = error.code === 403 || error.status === 403;
    res.status(needsReauth ? 403 : 500).json({
      success: false,
      error: needsReauth ? 'Insufficient permissions — please reconnect GSC with updated scopes.' : error.message,
    });
  }
});

// 10. Get a site verification token (HTML meta tag method)
app.post('/api/feature/verify/token', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { siteUrl } = req.body as { siteUrl: string };

  if (!siteUrl) return res.status(400).json({ success: false, error: 'siteUrl is required' });

  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);
  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const siteVerification = google.siteVerification({ version: 'v1', auth: oauth2Client });

    const response = await siteVerification.webResource.getToken({
      requestBody: {
        site: { type: 'SITE', identifier: siteUrl },
        verificationMethod: 'META',
      },
    });

    const verificationToken = response.data.token;
    const metaTag = `<meta name="google-site-verification" content="${verificationToken}" />`;

    res.json({ success: true, data: { token: verificationToken, metaTag } });
  } catch (error: any) {
    const needsReauth = error.code === 403 || error.status === 403;
    res.status(needsReauth ? 403 : 500).json({
      success: false,
      error: needsReauth ? 'Insufficient permissions — please reconnect GSC with updated scopes.' : error.message,
    });
  }
});

// 11. Trigger site verification after the meta tag has been deployed
app.post('/api/feature/verify/confirm', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { siteUrl } = req.body as { siteUrl: string };

  if (!siteUrl) return res.status(400).json({ success: false, error: 'siteUrl is required' });

  const [tokenRecord] = await db.select().from(gscTokens).where(eq(gscTokens.deseoUserId, userId)).limit(1);
  if (!tokenRecord) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokenRecord.tokens as any);
    const siteVerification = google.siteVerification({ version: 'v1', auth: oauth2Client });

    const response = await siteVerification.webResource.verify({
      verificationMethod: 'META',
      requestBody: {
        site: { type: 'SITE', identifier: siteUrl },
        verificationMethod: 'META',
      },
    });

    res.json({
      success: true,
      data: {
        verified: true,
        id: response.data.id,
        site: response.data.site,
      },
    });
  } catch (error: any) {
    const isVerificationFailed = error.code === 400 || error.status === 400;
    const needsReauth = error.code === 403 || error.status === 403;
    res.status(error.code ?? 500).json({
      success: false,
      error: isVerificationFailed
        ? 'Verification failed — ensure the meta tag is deployed and publicly accessible.'
        : needsReauth
          ? 'Insufficient permissions — please reconnect GSC with updated scopes.'
          : error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🔌 GSC Connector listening on http://localhost:${PORT}`);
});
