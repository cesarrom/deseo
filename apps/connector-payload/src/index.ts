import express from 'express';
import cors from 'cors';

import axios from 'axios';
import cookieParser from 'cookie-parser';
import { astToPayloadBlocks } from '@deseo/ast';



const app = express();
const PORT = process.env.PORT || 3004;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Simple In-Memory Store for User Payload Config
// In production, this would be a persistent DB.
interface UserPayloadConfig {
  instanceUrl: string;
  apiKey: string;
  collection: string;
}
const configStore = new Map<string, UserPayloadConfig>();

// 1. The Configuration UI (Handshake Entrypoint from Hub)
app.get('/ui/configure', async (req, res) => {
  const { code, deseo_url } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const response = await axios.post(`${HUB_URL}/registry.exchangeCode`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        code: code as string,
      }
    });

    const { userId } = response.data.result.data.json;
    res.cookie('deseo_user_id', userId, { httpOnly: true, maxAge: 600000 });

    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #fafafa;">
          <div style="background: white; padding: 2rem; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e5e7eb; width: 400px;">
            <h1 style="margin-bottom: 1rem;">Connect Payload CMS</h1>
            <p style="color: #6b7280; margin-bottom: 1.5rem;">Enter your Payload details to enable one-click publishing.</p>
            <form action="/ui/save-config" method="POST" style="display: flex; flex-direction: column; gap: 1rem;">
              <input type="hidden" name="deseo_url" value="${deseo_url}">
              <div>
                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Instance URL</label>
                <input name="instanceUrl" placeholder="https://cms.your-site.com" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;" required>
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">API Key</label>
                <input name="apiKey" type="password" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;" required>
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Collection Slug</label>
                <input name="collection" placeholder="posts" value="articles" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;" required>
              </div>
              <button type="submit" style="margin-top: 1rem; background: #000; color: white; padding: 0.75rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer;">Save Connection</button>
            </form>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Handshake failed');
  }
});

// Handle form submission
app.use(express.urlencoded({ extended: true }));
app.post('/ui/save-config', (req, res) => {
  const deseoUserId = req.cookies['deseo_user_id'];
  const { instanceUrl, apiKey, collection, deseo_url } = req.body;

  if (!deseoUserId) return res.status(401).send('Session expired');

  configStore.set(deseoUserId, { instanceUrl, apiKey, collection });
  console.log(`✅ Saved Payload config for Deseo User: ${deseoUserId}`);

  res.send(`
    <html>
      <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
        <h1>✅ Payload Connected!</h1>
        <p>Your CMS is ready for AI-generated content.</p>
        <button onclick="window.location.href='${deseo_url}/dashboard/settings'">Back to Dashboard</button>
      </body>
    </html>
  `);
});

// 2. CMS Provider Action: Publish Article
app.post('/api/feature/cms/publish', async (req, res) => {
  const deseoUserId = req.headers['x-deseo-user-id'] as string;
  const { title, slug, content } = req.body; // content is the AST
  const config = configStore.get(deseoUserId);

  if (!config) return res.status(401).json({ success: false, error: 'CMS not configured' });

  try {
    // Convert AST to Payload Blocks
    const blocks = astToPayloadBlocks(content);

    // Call Payload API
    const response = await axios.post(
      `${config.instanceUrl}/api/${config.collection}`,
      {
        title,
        slug,
        layout: blocks,
        _status: 'draft',
      },
      {
        headers: {
          'Authorization': `users API-Key ${config.apiKey}`,
        }
      }
    );

    res.json({
      success: true,
      data: {
        id: response.data.doc.id,
        url: `${config.instanceUrl}/${config.collection}/${response.data.doc.id}`,
      }
    });
  } catch (error: any) {
    console.error('Payload publish failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔌 Payload Connector listening on http://localhost:${PORT}`);
});
