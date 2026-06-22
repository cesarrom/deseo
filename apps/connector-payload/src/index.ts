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

// ---------------------------------------------------------------------------
// Image node conversion: upload our images to Payload's media collection and
// replace `type:"image"` nodes with Payload's native `type:"upload"` nodes.
// ---------------------------------------------------------------------------

async function uploadImageToPayloadMedia(
  src: string,
  altText: string,
  instanceUrl: string,
  apiKey: string,
  mediaCollection = 'media',
): Promise<string | null> {
  console.log(`🖼️  [Payload] Uploading image to media: ${src.slice(0, 80)}`);
  try {
    const imageResp = await fetch(src);
    if (!imageResp.ok) {
      console.warn(`[Payload] Could not fetch image ${src}: ${imageResp.status}`);
      return null;
    }
    const buffer = await imageResp.arrayBuffer();
    const contentType = imageResp.headers.get('content-type') ?? 'image/png';
    const ext = contentType.split('/')[1]?.split(';')[0] ?? 'png';

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: contentType }), `image-${Date.now()}.${ext}`);
    // alt is required by Payload's media collection — always send a value
    formData.append('alt', altText || 'Article image');

    const uploadResp = await fetch(`${instanceUrl}/api/${mediaCollection}`, {
      method: 'POST',
      headers: { Authorization: `users API-Key ${apiKey}` },
      body: formData,
    });

    if (!uploadResp.ok) {
      const text = await uploadResp.text();
      console.warn(`[Payload] Media upload ${uploadResp.status}: ${text.slice(0, 300)}`);
      return null;
    }

    const data = (await uploadResp.json()) as any;
    const id = data?.doc?.id ?? data?.id ?? null;
    console.log(`✅ [Payload] Image in media collection: ${id}`);
    return id;
  } catch (err: any) {
    console.error('[Payload] Image upload threw:', err.message);
    return null;
  }
}

/** Fallback for when Payload media upload is unavailable or not configured.
 *  Wraps the image URL in a link paragraph so it's never silently lost.
 *  Uses Payload v3's LinkNode format: URL lives in `fields`, not at root level. */
function imageFallbackNode(src: string, altText: string): any {
  const label = altText || 'Image';
  return {
    type: 'paragraph',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'link',
        version: 3,
        direction: 'ltr',
        format: '',
        indent: 0,
        url: src,
        // Payload v3 LinkNode stores URL inside `fields`, not at root
        fields: {
          url: src,
          newTab: true,
          rel: 'noreferrer noopener',
          linkType: 'custom',
        },
        children: [{
          type: 'text',
          version: 1,
          text: `[Image: ${label}]`,
          format: 0,
          mode: 'normal',
          style: '',
          detail: 0,
        }],
      },
    ],
  };
}

async function convertImageNodes(
  node: any,
  instanceUrl: string,
  apiKey: string,
  mediaCollection = 'media',
): Promise<any> {
  if (!node || typeof node !== 'object') return node;

  if (node.type === 'image') {
    const src: string = node.src ?? node.url ?? '';
    const altText: string = node.altText ?? node.alt ?? '';
    if (!src) return null;

    const mediaId = await uploadImageToPayloadMedia(src, altText, instanceUrl, apiKey, mediaCollection);

    if (mediaId) {
      // Payload-native upload node (requires UploadFeature + media collection)
      return {
        type: 'upload',
        version: 3,
        relationTo: mediaCollection,
        value: { id: mediaId },
        direction: null,
        format: '',
        indent: 0,
      };
    }

    // Fallback: keep the image as a clickable link — never silently drop it
    console.log(`⚠️  [Payload] Media upload failed, falling back to link for: ${src.slice(0, 60)}`);
    return imageFallbackNode(src, altText);
  }

  if (Array.isArray(node.children)) {
    const children = await Promise.all(node.children.map((c: any) => convertImageNodes(c, instanceUrl, apiKey, mediaCollection)));
    return { ...node, children: children.filter(Boolean) };
  }

  return node;
}
const PORT = process.env.PORT || 3004;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';
const baseUrl = (process.env.BASE_URL || process.env.CONNECTOR_PAYLOAD_BASE_URL || '').replace(/\/$/, '');

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
            <form action="${baseUrl}/ui/save-config" method="POST" style="display: flex; flex-direction: column; gap: 1rem;">
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
              <div>
                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Media Collection Slug</label>
                <input name="mediaCollection" placeholder="media" value="media" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;" required>
                <p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">The Payload collection used to store images (usually "media").</p>
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
  const { instanceUrl, apiKey, collection, mediaCollection = 'media', deseo_url } = req.body;

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
          mediaCollection,
        })
        .onConflictDoUpdate({
          target: payloadConfigs.deseoUserId,
          set: { instanceUrl, apiKey, collection, mediaCollection, updatedAt: new Date() },
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
    // Convert AST to Payload Lexical format
    const rawBlocks = astToPayloadBlocks(content);

    // Upload any external image nodes to Payload's media collection,
    // replacing type:"image" with type:"upload" (Payload's native image node).
    // Falls back to a link paragraph if the media upload fails.
    const blocks = {
      ...rawBlocks,
      root: await convertImageNodes(
        rawBlocks.root,
        config.instanceUrl,
        config.apiKey,
        config.mediaCollection ?? 'media',
      ),
    };

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

    // Sanitise slug: lowercase, hyphens only, no trailing/leading hyphens
    const safeSlug = (slug as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      || `article-${Date.now()}`;

    const body = {
      title,
      slug: safeSlug,
      content: blocks,
    };

    console.log(`📤 [Payload] Sending to /${config.collection}:`, JSON.stringify({ title, slug: safeSlug, contentNodeCount: blocks?.root?.children?.length }));

    if (existingDoc) {
      console.log(`🔄 [Payload] Updating document ID: ${existingDoc.id}`);
      response = await axios.patch(
        `${config.instanceUrl}/api/${config.collection}/${existingDoc.id}`,
        body,
        { headers: authHeader }
      );
    } else {
      console.log(`🆕 [Payload] Creating new document.`);
      response = await axios.post(
        `${config.instanceUrl}/api/${config.collection}`,
        body,
        { headers: authHeader }
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
    const payloadErrors = error.response?.data?.errors;
    const payloadMessage = payloadErrors
      ? payloadErrors.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ')
      : error.response?.data?.message;
    const detail = payloadMessage || error.response?.data || error.message;

    console.error('❌ [Payload] Publish failed:', JSON.stringify(error.response?.data ?? error.message));

    res.status(500).json({
      success: false,
      error: typeof detail === 'string' ? detail : JSON.stringify(detail),
    });
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
          <form action="${baseUrl}/ui/save-config" method="POST" style="display: flex; flex-direction: column; gap: 1rem;">
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
            <div>
              <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Media Collection Slug</label>
              <input name="mediaCollection" value="${config.mediaCollection ?? 'media'}" placeholder="media" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;" required>
              <p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">The Payload collection used to store images (usually "media").</p>
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
