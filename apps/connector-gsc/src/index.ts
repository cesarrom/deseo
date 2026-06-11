import express from 'express';
import cors from 'cors';

import axios from 'axios';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';



const app = express();
const PORT = process.env.PORT || 3003;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:${PORT}/api/auth/google/callback`
);

// Simple In-Memory Token Store
const tokenStore = new Map<string, any>();

// 1. The Configuration UI (Handshake Entrypoint from Hub)
app.get('/ui/configure', async (req, res) => {
  const { code } = req.query;

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

    const { userId } = response.data.result.data.json;
    res.cookie('deseo_user_id', userId, { httpOnly: true, maxAge: 600000 });

    // Generate Google Auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
      prompt: 'consent'
    });

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
    res.status(500).send('Deseo Identity exchange failed');
  }
});

// 2. Google OAuth Callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  const deseoUserId = req.cookies['deseo_user_id'];

  if (!code || !deseoUserId) return res.status(400).send('Session expired or missing code');

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    tokenStore.set(deseoUserId, tokens);

    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>✅ GSC Connected!</h1>
          <p>Deseo can now analyze your search performance.</p>
          <button onclick="window.location.href='http://localhost:3000/dashboard/settings'">Back to Dashboard</button>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Google Authorization failed');
  }
});

// 3. GSC Provider Action: Fetch Performance
app.post('/api/feature/analytics/performance', async (req, res) => {
  const deseoUserId = req.headers['x-deseo-user-id'] as string;
  const { siteUrl, startDate, endDate } = req.body;
  const tokens = tokenStore.get(deseoUserId);

  if (!tokens) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    oauth2Client.setCredentials(tokens);
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

app.listen(PORT, () => {
  console.log(`🔌 GSC Connector listening on http://localhost:${PORT}`);
});
