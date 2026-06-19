import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

console.log(
  `🔌 [Payload] Initializing with DATABASE_URL: ${process.env.DATABASE_URL?.split('@').pop()}`
);

import express from 'express';
import cors from 'cors';

import axios from 'axios';
import cookieParser from 'cookie-parser';
import { astToPayloadBlocks } from '@deseo/ast';
import { db } from '../db';
import { payloadConfigs } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { ConnectorSDK } from '@deseo/connector-sdk';
import { payloadToAst } from '@deseo/ast';

const sdk = new ConnectorSDK(process.env.DESEO_CLIENT_SECRET!);
const app = express();
const PORT = process.env.PORT || 3004;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 1. The Configuration UI (Handshake Entrypoint from Hub)
app.get('/ui/configure', async (req, res) => {
  const { code, deseo_url } = req.query;
  console.log('🏁 [Payload] Handshake started with code:', code);

  if (!code) return res.status(400).send('Missing authorization code');

  try {
    console.log('📡 [Payload] Exchanging code for Deseo Identity at:', HUB_URL);
    const response = await axios.post(`${HUB_URL}/registry.exchangeCode`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        code: code as string,
      },
    });

    const { userId, installationId } = response.data.result.data.json;
    console.log(
      '✅ [Payload] Handshake successful. User:',
      userId,
      'Installation:',
      installationId
    );

    res.cookie('deseo_user_id', userId, { httpOnly: true, maxAge: 600000 });
    res.cookie('deseo_installation_id', installationId, { httpOnly: true, maxAge: 600000 });

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
  } catch (error: any) {
    console.error('❌ [Payload] Identity exchange failed:', error.response?.data || error.message);
    res.status(500).send('Handshake failed');
  }
});

// Handle form submission
app.use(express.urlencoded({ extended: true }));
app.post('/ui/save-config', async (req, res) => {
  const deseoUserId = req.cookies['deseo_user_id'];
  const installationId = req.cookies['deseo_installation_id'];
  const { instanceUrl, apiKey, collection, deseo_url } = req.body;

  console.log('🔄 [Payload] Configuration form submitted for user:', deseoUserId);

  if (!deseoUserId || !installationId) {
    console.error('❌ [Payload] Session expired or missing IDs');
    return res.status(401).send('Session expired');
  }

  try {
    console.log('📡 [Payload] Validating credentials with instance:', instanceUrl);
    // Validate credentials by fetching one item or hitting an endpoint
    await axios.get(`${instanceUrl}/api/${collection}?limit=1`, {
      headers: { Authorization: `users API-Key ${apiKey}` },
    });

    // Diagnostic: Check table existence right before insert
    const tableCheck = await db.execute(
      sql`SELECT count(*) FROM information_schema.tables WHERE table_name = 'payload_configs'`
    );
    console.log('🔍 [Payload] Table "payload_configs" exists:', (tableCheck[0] as any).count > 0);

    // Store Config in DB
    try {
      await db
        .insert(payloadConfigs)
        .values({
          deseoUserId,
          instanceUrl,
          apiKey,
          collection,
        })
        .onConflictDoUpdate({
          target: payloadConfigs.deseoUserId,
          set: { instanceUrl, apiKey, collection, updatedAt: new Date() },
        });
    } catch (dbError: any) {
      console.error('❌ [Payload] Database insertion failed. Full Error:', {
        message: dbError.message,
        detail: dbError.detail,
        hint: dbError.hint,
        code: dbError.code,
        query: dbError.query,
      });
      throw new Error(
        `Database Error: ${dbError.message || 'Failed to save configuration'}. Detail: ${dbError.detail || 'None'}`
      );
    }

    console.log('✅ [Payload] Validation successful. Config saved.');

    // Push 'active' status back to Deseo Hub
    console.log('📡 [Payload] Pushing ACTIVE status to Hub for installation:', installationId);
    await axios.post(`${HUB_URL}/registry.updateInstallationStatus`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        installationId,
        status: 'active',
        config: { instanceUrl, collection },
      },
    });

    console.log('🎊 [Payload] Connection complete!');
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>✅ Payload Connected!</h1>
          <p>Your CMS is ready for AI-generated content.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'DESEO_INSTALL_COMPLETE', app: 'payload' }, '*');
            }
          </script>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ [Payload] Validation failed:', error.response?.data || error.message);
    res.status(400).send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1 style="color: #dc2626;">❌ Validation Failed</h1>
          <p>Could not connect to Payload. Please check your URL and API Key.</p>
          <p style="color: #6b7280; font-size: 0.875rem;">Error: ${error.response?.data?.errors?.[0]?.message || error.message}</p>
          <button onclick="window.history.back()">Try Again</button>
        </body>
      </html>
    `);
  }
});

// 2. CMS Provider Action: Publish Article
app.post('/api/feature/cms/publish', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { title, slug, content } = req.body; // content is the AST
  const [config] = await db
    .select()
    .from(payloadConfigs)
    .where(eq(payloadConfigs.deseoUserId, userId))
    .limit(1);

  if (!config) return res.status(401).json({ success: false, error: 'CMS not configured' });

  try {
    // Convert AST to Payload Blocks
    const blocks = astToPayloadBlocks(content);

    const authHeader = {
      Authorization: `users API-Key ${config.apiKey}`,
    };

    // Check if the document already exists with the given slug
    console.log(`🔍 [Payload] Checking if slug '${slug}' exists in collection '${config.collection}'`);
    const existingDocResponse = await axios.get(
      `${config.instanceUrl}/api/${config.collection}?where[slug][equals]=${slug}&limit=1`,
      {
        headers: authHeader,
      }
    );

    const existingDoc = existingDocResponse.data?.docs?.[0];
    let response;

    if (existingDoc) {
      console.log(`🔄 [Payload] Slug '${slug}' already exists. Updating document ID: ${existingDoc.id}`);
      response = await axios.patch(
        `${config.instanceUrl}/api/${config.collection}/${existingDoc.id}`,
        {
          title,
          slug,
          content: blocks,
          layout: blocks,
          _status: 'draft',
        },
        {
          headers: authHeader,
        }
      );
    } else {
      console.log(`🆕 [Payload] Slug '${slug}' does not exist. Creating new document.`);
      response = await axios.post(
        `${config.instanceUrl}/api/${config.collection}`,
        {
          title,
          slug,
          content: blocks,
          layout: blocks,
          _status: 'draft',
        },
        {
          headers: authHeader,
        }
      );
    }

    const doc = response.data?.doc || response.data;
    const docId = doc?.id;

    if (!docId) {
      throw new Error('Payload response did not return a valid document ID.');
    }

    res.json({
      success: true,
      data: {
        id: docId,
        url: `${config.instanceUrl}/${config.collection}/${docId}`,
      },
    });
  } catch (error: any) {
    console.error('Payload publish failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. CMS Provider Action: Dashboard Data
app.get('/api/feature/cms/dashboard', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const [config] = await db
    .select()
    .from(payloadConfigs)
    .where(eq(payloadConfigs.deseoUserId, userId))
    .limit(1);

  if (!config) return res.status(401).json({ success: false, error: 'CMS not configured' });

  try {
    const auth = { Authorization: `users API-Key ${config.apiKey}` };

    // 1. Fetch recent articles
    const articlesResponse = await axios.get(
      `${config.instanceUrl}/api/${config.collection}?limit=10&sort=-updatedAt`,
      { headers: auth }
    );
    const articles = articlesResponse.data.docs;

    const recentArticles = articles.map((a: any) => ({
      id: a.id,
      title: a.title,
      status: a._status || 'published',
      updatedAt: a.updatedAt,
    }));

    // 2. Calculate stats
    const stats = articles.reduce(
      (acc: any, a: any) => {
        const status = a._status || 'published';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { published: 0, drafts: 0, scheduled: 0 }
    );

    res.json({
      success: true,
      data: {
        stats,
        recentArticles,
      },
    });
  } catch (error: any) {
    console.error('Payload Dashboard failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// 4. CMS Provider Action: List Collections
app.get('/api/feature/cms/collections', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const [config] = await db
    .select()
    .from(payloadConfigs)
    .where(eq(payloadConfigs.deseoUserId, userId))
    .limit(1);

  if (!config) return res.status(401).json({ success: false, error: 'CMS not configured' });

  try {
    const auth = { Authorization: `users API-Key ${config.apiKey}` };
    // Validate collection access by querying a single document using the standard collection slug endpoint
    const response = await axios.get(`${config.instanceUrl}/api/${config.collection}?limit=1`, {
      headers: auth,
    });

    // Attempt to infer field names from a sample document if it exists, otherwise fall back to common defaults
    const sampleDoc = response.data?.docs?.[0] || {};
    const keys = Object.keys(sampleDoc);
    const fields = keys.length > 0 ? keys : ['title', 'slug', 'content', 'heroImage', 'status'];

    const collections = [
      {
        slug: config.collection,
        name: config.collection.charAt(0).toUpperCase() + config.collection.slice(1),
        fields: fields,
      },
    ];

    res.json({ success: true, data: collections });
  } catch (error: any) {
    console.error(
      '❌ [Payload] Failed to fetch collections:',
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: `Failed to fetch collections: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    });
  }
});

// 5. CMS Provider Action: Sync Posts
app.get('/api/feature/cms/sync', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { collection } = req.query;
  const [config] = await db
    .select()
    .from(payloadConfigs)
    .where(eq(payloadConfigs.deseoUserId, userId))
    .limit(1);

  if (!config) return res.status(401).json({ success: false, error: 'CMS not configured' });

  try {
    const auth = { Authorization: `users API-Key ${config.apiKey}` };
    const response = await axios.get(
      `${config.instanceUrl}/api/${collection || config.collection}?limit=50&sort=-updatedAt`,
      { headers: auth }
    );

    const posts = response.data.docs.map((doc: any) => ({
      externalId: doc.id,
      title: doc.title,
      slug: doc.slug,
      content: payloadToAst(doc.layout || doc.content), // Convert to Deseo AST (Lexical)
      status: doc._status || 'published',
      author: doc.author?.name || doc.author,
      updatedAt: doc.updatedAt,
      publishedAt: doc.publishedAt || doc.createdAt,
      metadata: {
        payloadCollection: collection || config.collection,
      },
    }));

    res.json({ success: true, data: posts });
  } catch (error: any) {
    console.error('❌ [Payload] Sync failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to sync posts' });
  }
});

// 6. The Settings UI (Post-Installation Configuration)
app.get('/ui/settings', async (req, res) => {
  const deseoUserId = req.cookies['deseo_user_id'];
  const installationId = req.query.installationId;

  if (!deseoUserId || !installationId) {
    return res.status(401).send('Session expired. Please reconnect from Deseo Hub.');
  }

  // Retrieve existing config from DB
  const [existingConfig] = await db
    .select()
    .from(payloadConfigs)
    .where(eq(payloadConfigs.deseoUserId, deseoUserId))
    .limit(1);
  const config = existingConfig || { instanceUrl: '', apiKey: '', collection: 'articles' };

  res.send(`
    <html>
      <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #fafafa;">
        <div style="background: white; padding: 2rem; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e5e7eb; width: 400px;">
          <h1 style="margin-bottom: 1rem;">Payload Settings</h1>
          <p style="color: #6b7280; margin-bottom: 1.5rem;">Update your Payload CMS connection details.</p>
          <form action="/ui/save-config" method="POST" style="display: flex; flex-direction: column; gap: 1rem;">
            <input type="hidden" name="deseo_url" value="">
            <div>
              <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Instance URL</label>
              <input name="instanceUrl" value="${config.instanceUrl}" placeholder="https://cms.your-site.com" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;" required>
            </div>
            <div>
              <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">API Key</label>
              <input name="apiKey" value="${config.apiKey}" type="password" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;" required>
            </div>
            <div>
              <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Collection Slug</label>
              <input name="collection" value="${config.collection}" placeholder="posts" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;" required>
            </div>
            <button type="submit" style="margin-top: 1rem; background: #000; color: white; padding: 0.75rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer;">Update Connection</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, async () => {
  console.log(`🔌 Payload Connector listening on http://localhost:${PORT}`);

  try {
    // Diagnostic: Check connection and tables
    const tables = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    console.log(
      '📊 [Payload] Available tables in public schema:',
      tables.map((t: any) => t.table_name)
    );
  } catch (error: any) {
    console.error('❌ [Payload] Database connection/diagnostic failed:', error.message);
  }
});
