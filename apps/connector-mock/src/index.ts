import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { ConnectorSDK } from '@deseo/connector-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const sdk = new ConnectorSDK(process.env.DESEO_CLIENT_SECRET || 'mock-secret');
const app = express();
const PORT = process.env.PORT || 3005;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';

app.use(cors());
app.use(express.json());

// 1. Mock Handshake
app.get('/ui/configure', async (req, res) => {
  const { code } = req.query;
  console.log('🧪 [Mock] Handshake started with code:', code);

  if (!code) return res.status(400).send('Missing authorization code');

  try {
    // Exchange code for Deseo Identity
    const response = await axios.post(`${HUB_URL}/registry.exchangeCode`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        code: code as string,
      }
    });

    const { installationId } = response.data.result.data.json;
    console.log('✅ [Mock] Identity exchange successful. Installation:', installationId);

    // Immediately push 'active' status back to Deseo Hub
    await axios.post(`${HUB_URL}/registry.updateInstallationStatus`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        installationId,
        status: 'active'
      }
    });

    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>🧪 Mock Connector Connected!</h1>
          <p>This connector is running in mock mode. No real credentials were used.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'DESEO_INSTALL_COMPLETE', app: 'mock' }, '*');
            }
            setTimeout(() => window.close(), 2000);
          </script>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ [Mock] Identity exchange failed:', error.response?.data || error.message);
    res.status(500).send('Mock Identity exchange failed');
  }
});

// 2. Mock Git Repositories
app.get('/api/feature/git/repositories', sdk.authMiddleware(), (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'mock-repo-1', fullName: 'acme/mock-repo-1', url: '#', defaultBranch: 'main', isPrivate: false },
      { id: '2', name: 'mock-repo-2', fullName: 'acme/mock-repo-2', url: '#', defaultBranch: 'master', isPrivate: true },
    ]
  });
});

// 3. Mock Git Dashboard
app.get('/api/feature/git/dashboard', sdk.authMiddleware(), (req, res) => {
  res.json({
    success: true,
    data: {
      recentCommits: [
        { sha: 'abc123', message: 'Initial commit', author: 'Mock User', date: new Date().toISOString() },
        { sha: 'def456', message: 'Add SEO meta tags', author: 'Deseo AI', date: new Date().toISOString() },
      ],
      openPullRequests: [
        { id: '101', number: 1, url: '#', title: 'SEO Fix: Add Meta Tags', status: 'open' }
      ],
      activityOverTime: [
        { date: '2026-06-10', count: 5 },
        { date: '2026-06-11', count: 8 },
        { date: '2026-06-12', count: 3 },
        { date: '2026-06-13', count: 12 },
        { date: '2026-06-14', count: 7 },
        { date: '2026-06-15', count: 9 },
        { date: '2026-06-16', count: 4 },
      ]
    }
  });
});

// 4. Mock CMS Collections
app.get('/api/feature/cms/collections', sdk.authMiddleware(), (req, res) => {
  res.json({
    success: true,
    data: [
      { slug: 'posts', name: 'Blog Posts' },
      { slug: 'pages', name: 'Landing Pages' },
    ]
  });
});

// 5. Mock CMS Sync
app.get('/api/feature/cms/sync', sdk.authMiddleware(), (req, res) => {
  res.json({
    success: true,
    data: [
      {
        externalId: 'mock-post-1',
        title: 'Welcome to our Mock Blog',
        slug: 'welcome-mock',
        status: 'published',
        content: { root: { children: [{ text: 'This is a mock post content.' }] } },
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      }
    ]
  });
});

// 6. Mock Analytics Sites
app.get('/api/feature/analytics/sites', sdk.authMiddleware(), (req, res) => {
  res.json({
    success: true,
    data: [
      { siteUrl: 'https://mock-site.com' },
      { siteUrl: 'sc-domain:mock-app.io' },
    ]
  });
});

// 7. Mock Analytics Sync
app.post('/api/feature/analytics/sync', sdk.authMiddleware(), (req, res) => {
  res.json({
    success: true,
    data: [
      { query: 'mock seo tool', clicks: 150, impressions: 2000, ctr: 0.075, position: 2.4, date: new Date().toISOString() },
      { query: 'ai content generator', clicks: 80, impressions: 1200, ctr: 0.066, position: 5.1, date: new Date().toISOString() },
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🧪 Mock Connector listening on http://localhost:${PORT}`);
});
