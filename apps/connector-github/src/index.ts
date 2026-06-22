import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

console.log(`🔌 [GitHub] Initializing with DATABASE_URL: ${process.env.DATABASE_URL?.split('@').pop()}`);

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import { db } from '../db';
import { githubTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ConnectorSDK } from '@deseo/connector-sdk';

const sdk = new ConnectorSDK(process.env.DESEO_CLIENT_SECRET!);
const app = express();
const PORT = process.env.PORT || 3002;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';
const baseUrl = (process.env.BASE_URL || process.env.CONNECTOR_GITHUB_BASE_URL || '').replace(/\/$/, '');
const redirectUri = baseUrl ? `${baseUrl}/api/auth/github/callback` : undefined;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Load GitHub App Private Key for Server-to-Server authentication
let githubPrivateKey = '';
try {
  const pkPath = path.join(__dirname, '../github_pk.pem');
  if (fs.existsSync(pkPath)) {
    githubPrivateKey = fs.readFileSync(pkPath, 'utf8');
    console.log('🔑 [GitHub] Successfully loaded GitHub App Private Key');
  } else {
    console.warn('⚠️ [GitHub] github_pk.pem not found. Background tasks requiring App authentication may fail.');
  }
} catch (error) {
  console.error('❌ [GitHub] Error reading Private Key:', error);
}

// 1. The Configuration UI (Handshake Entrypoint from Hub)
app.get('/ui/configure', async (req, res) => {
  const { code } = req.query;
  console.log('🏁 [GitHub] Handshake started with code:', code);

  if (!code) return res.status(400).send('Missing authorization code');

  try {
    console.log('📡 [GitHub] Exchanging code for Deseo Identity at:', HUB_URL);
    // Exchange code for Deseo Identity
    const response = await axios.post(`${HUB_URL}/registry.exchangeCode`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        code: code as string,
      }
    });

    const { userId, installationId } = response.data.result.data.json;
    console.log('✅ [GitHub] Handshake successful. User:', userId, 'Installation:', installationId);
    
    // Store Deseo User ID and Installation ID in secure cookies
    res.cookie('deseo_user_id', userId, { httpOnly: true, maxAge: 600000 });
    res.cookie('deseo_installation_id', installationId, { httpOnly: true, maxAge: 600000 });

    // Show landing page to start GitHub OAuth
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>Connect GitHub</h1>
          <p>Deseo User Identified: <code>${userId}</code></p>
          <a href="https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}${redirectUri ? `&redirect_uri=${redirectUri}` : ''}&scope=repo,user" 
             style="padding: 12px 24px; background: #24292e; color: white; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Authorize GitHub Access
          </a>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ [GitHub] Identity exchange failed:', error.response?.data || error.message);
    res.status(500).send('Deseo Identity exchange failed');
  }
});

// 2. GitHub OAuth Callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  const deseoUserId = req.cookies['deseo_user_id'];
  const installationId = req.cookies['deseo_installation_id'];

  console.log('🔄 [GitHub] OAuth callback received. Code present:', !!code);

  if (!code || !deseoUserId || !installationId) {
    console.error('❌ [GitHub] Session expired or missing code:', { hasCode: !!code, hasUser: !!deseoUserId, hasInst: !!installationId });
    return res.status(400).send('Session expired or missing code');
  }

  try {
    console.log('📡 [GitHub] Exchanging GitHub code for access token...');
    // Exchange GitHub code for Access Token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token } = tokenResponse.data;
    console.log('✅ [GitHub] Token obtained. Linking to user:', deseoUserId);

    // Link GitHub Token to Deseo User in DB
    await db.insert(githubTokens).values({
      deseoUserId,
      accessToken: access_token,
    }).onConflictDoUpdate({
      target: githubTokens.deseoUserId,
      set: { accessToken: access_token, updatedAt: new Date() }
    });

    // Push 'active' status back to Deseo Hub
    console.log('📡 [GitHub] Pushing ACTIVE status to Hub for installation:', installationId);
    await axios.post(`${HUB_URL}/registry.updateInstallationStatus`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        installationId,
        status: 'active'
      }
    });

    console.log('🎊 [GitHub] Connection complete!');
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>✅ GitHub Connected!</h1>
          <p>You can now close this window and return to Deseo.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'DESEO_INSTALL_COMPLETE', app: 'github' }, '*');
            }
          </script>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ [GitHub] Authorization failed:', error.response?.data || error.message);
    res.status(500).send('GitHub Authorization failed');
  }
});

// 3. Git Provider Action: List Repositories
app.get('/api/feature/git/repositories', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.deseoUserId, userId)).limit(1);

  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const reposResponse = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });

    const repos = reposResponse.data.map((r: any) => ({
      id: r.id.toString(),
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      defaultBranch: r.default_branch,
      isPrivate: r.private
    }));

    res.json({ success: true, data: repos });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch repositories' });
  }
});

// 4. Git Provider Action: Create Pull Request
app.post('/api/feature/git/pr', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { repository, title, body, head, base } = req.body;
  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.deseoUserId, userId)).limit(1);

  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const prResponse = await axios.post(`https://api.github.com/repos/${repository}/pulls`, {
      title,
      body,
      head,
      base
    }, {
      headers: { 
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/vnd.github+json'
      }
    });

    res.json({ 
      success: true, 
      data: {
        id: prResponse.data.id.toString(),
        number: prResponse.data.number,
        url: prResponse.data.html_url,
        status: 'open'
      }
    });
  } catch (error: any) {
    console.error('GitHub PR failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || 'Failed to create PR' });
  }
});

// 5. Git Provider Action: Scan and Fix (Automated SEO Improvement)
app.post('/api/feature/git/scan-and-fix', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { repository } = req.body;
  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.deseoUserId, userId)).limit(1);

  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    
    // 1. Get default branch SHA
    const repoInfo = await axios.get(`https://api.github.com/repos/${repository}`, { headers: auth });
    const baseBranch = repoInfo.data.default_branch;
    const baseRef = await axios.get(`https://api.github.com/repos/${repository}/git/refs/heads/${baseBranch}`, { headers: auth });
    const latestSha = baseRef.data.object.sha;

    // 2. Create a new SEO branch
    const newBranch = `deseo-seo-fix-${Date.now()}`;
    await axios.post(`https://api.github.com/repos/${repository}/git/refs`, {
      ref: `refs/heads/${newBranch}`,
      sha: latestSha
    }, { headers: auth });

    // 3. Apply a fix (e.g., adding an SEO-friendly README or meta file)
    const content = Buffer.from(`# SEO Optimized Repository\n\nGenerated by Deseo AI on ${new Date().toISOString()}`).toString('base64');
    await axios.put(`https://api.github.com/repos/${repository}/contents/DESEO_SEO.md`, {
      message: 'docs: add SEO metadata tracking',
      content,
      branch: newBranch
    }, { headers: auth });

    // 4. Create the PR
    const prResponse = await axios.post(`https://api.github.com/repos/${repository}/pulls`, {
      title: '🚀 SEO Optimization: Meta Tracking Added',
      body: 'Automated SEO improvements by Deseo Platform.',
      head: newBranch,
      base: baseBranch
    }, { headers: auth });

    res.json({ 
      success: true, 
      data: {
        prUrl: prResponse.data.html_url,
        branch: newBranch
      }
    });
  } catch (error: any) {
    console.error('Scan and Fix failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Git Provider Action: Dashboard Data
app.get('/api/feature/git/dashboard', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const repository = req.query.repository as string;
  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.deseoUserId, userId)).limit(1);

  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!repository) return res.status(400).json({ success: false, error: 'Repository is required' });

  try {
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    
    // 1. Fetch recent commits
    const commitsResponse = await axios.get(`https://api.github.com/repos/${repository}/commits?per_page=5`, { headers: auth });
    const recentCommits = commitsResponse.data.map((c: any) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date
    }));

    // 2. Fetch open PRs
    const prsResponse = await axios.get(`https://api.github.com/repos/${repository}/pulls?state=open`, { headers: auth });
    const openPullRequests = prsResponse.data.map((pr: any) => ({
      id: pr.id.toString(),
      number: pr.number,
      url: pr.html_url,
      title: pr.title,
      status: 'open'
    }));

    // 3. Mock activity data (In a real app, you'd calculate this from commits/events)
    const activityOverTime = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10)
      };
    }).reverse();

    res.json({
      success: true,
      data: {
        recentCommits,
        openPullRequests,
        activityOverTime
      }
    });
  } catch (error: any) {
    console.error('GitHub Dashboard failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// 7. GitHub Webhook Handler
app.post('/api/webhook', async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`📥 [GitHub] Webhook received! Event: ${event}`);

  try {
    if (event === 'pull_request') {
      const { action, pull_request, repository } = payload;
      console.log(`🔧 [GitHub] PR ${pull_request.number} ${action} in ${repository.full_name}`);

      if (action === 'closed' && pull_request.merged) {
        console.log(`🎉 [GitHub] PR ${pull_request.number} was MERGED!`);
        // TODO: Notify Deseo Hub to mark the associated SEO fix as resolved
      }
    }

    if (event === 'push') {
      console.log(`🚀 [GitHub] Push detected on branch ${payload.ref} in ${payload.repository.full_name}`);
      // TODO: Trigger a re-audit if this is the default branch
    }

    // Always respond with 200 to GitHub
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ [GitHub] Webhook processing failed:', error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`🔌 GitHub Connector listening on http://localhost:${PORT}`);
});
