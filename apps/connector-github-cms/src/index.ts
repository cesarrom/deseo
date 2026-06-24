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
import { githubTokens, repoConfig } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ConnectorSDK } from '@deseo/connector-sdk';

const sdk = new ConnectorSDK(process.env.DESEO_CLIENT_SECRET!);
const app = express();
const PORT = process.env.PORT || 3005;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';
const baseUrl = (process.env.BASE_URL || process.env.CONNECTOR_GITHUB_CMS_BASE_URL || '').replace(/\/$/, '');
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

    // Link GitHub Token to Deseo User in DB (also store installationId)
    await db.insert(githubTokens).values({
      deseoUserId,
      accessToken: access_token,
      installationId,
    }).onConflictDoUpdate({
      target: githubTokens.deseoUserId,
      set: { accessToken: access_token, installationId, updatedAt: new Date() }
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
              window.opener.postMessage({ type: 'DESEO_INSTALL_COMPLETE', app: 'github-cms' }, '*');
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

// 5. Git Provider Action: Create Branch
app.post('/api/feature/git/branch', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { repository, branchName, baseBranch } = req.body;
  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.deseoUserId, userId)).limit(1);

  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    let baseSha = '';

    if (baseBranch) {
      const baseRef = await axios.get(`https://api.github.com/repos/${repository}/git/refs/heads/${baseBranch}`, { headers: auth });
      baseSha = baseRef.data.object.sha;
    } else {
      const repoInfo = await axios.get(`https://api.github.com/repos/${repository}`, { headers: auth });
      const defaultBranch = repoInfo.data.default_branch;
      const baseRef = await axios.get(`https://api.github.com/repos/${repository}/git/refs/heads/${defaultBranch}`, { headers: auth });
      baseSha = baseRef.data.object.sha;
    }

    await axios.post(`https://api.github.com/repos/${repository}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha: baseSha
    }, { headers: auth });

    res.json({
      success: true,
      data: {
        branchName,
        sha: baseSha
      }
    });
  } catch (error: any) {
    console.error('Create branch failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || 'Failed to create branch' });
  }
});

// 6. Git Provider Action: Commit Files (Using Git Trees API)
app.post('/api/feature/git/commit', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { repository, branchName, message, files } = req.body; // files: { path, content, encoding?: 'utf-8'|'base64' }[]
  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.deseoUserId, userId)).limit(1);

  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    // 1. Get current branch SHA and commit tree SHA
    const branchRef = await axios.get(`https://api.github.com/repos/${repository}/git/refs/heads/${branchName}`, { headers: auth });
    const latestCommitSha = branchRef.data.object.sha;

    const latestCommit = await axios.get(`https://api.github.com/repos/${repository}/git/commits/${latestCommitSha}`, { headers: auth });
    const baseTreeSha = latestCommit.data.tree.sha;

    // 2. Create blobs for all files
    const treePayload = [];
    for (const file of files) {
      const blobResponse = await axios.post(`https://api.github.com/repos/${repository}/git/blobs`, {
        content: file.content,
        encoding: file.encoding || 'utf-8'
      }, { headers: auth });

      treePayload.push({
        path: file.path,
        mode: '100644', // File
        type: 'blob',
        sha: blobResponse.data.sha
      });
    }

    // 3. Create a new tree
    const newTreeResponse = await axios.post(`https://api.github.com/repos/${repository}/git/trees`, {
      base_tree: baseTreeSha,
      tree: treePayload
    }, { headers: auth });

    // 4. Create a new commit
    const newCommitResponse = await axios.post(`https://api.github.com/repos/${repository}/git/commits`, {
      message,
      tree: newTreeResponse.data.sha,
      parents: [latestCommitSha]
    }, { headers: auth });

    // 5. Update branch ref
    await axios.patch(`https://api.github.com/repos/${repository}/git/refs/heads/${branchName}`, {
      sha: newCommitResponse.data.sha
    }, { headers: auth });

    res.json({
      success: true,
      data: {
        commitSha: newCommitResponse.data.sha
      }
    });
  } catch (error: any) {
    console.error('Commit files failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || 'Failed to commit files' });
  }
});

// 7. Git Provider Action: Get Files or Tree
app.get('/api/feature/git/files', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { repository, branch, path } = req.query as { repository: string; branch: string; path: string };
  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.deseoUserId, userId)).limit(1);

  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    let url = `https://api.github.com/repos/${repository}/contents`;
    if (path) url += `/${path}`;
    if (branch) url += `?ref=${branch}`;

    const contentsResponse = await axios.get(url, { headers: auth });

    res.json({
      success: true,
      data: contentsResponse.data
    });
  } catch (error: any) {
    console.error('Get files failed:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || 'Failed to get files' });
  }
});


// 8. Git Provider Action: Dashboard Data
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

// 9. GitHub Webhook Handler
app.post('/api/webhook', async (req, res) => {
  const event = req.headers['x-github-event'] as string;
  const payload = req.body;

  console.log(`📥 [GitHub] Webhook received! Event: ${event}`);

  try {
    if (event === 'push' || event === 'pull_request') {
      const repositoryFullName = payload.repository.full_name;

      // We need to find the user associated with this repository.
      // For simplicity in this demo implementation, we will fetch the first user who has a token
      // and assume they are the owner of the repo. In production, we would map the installationId from the webhook.
      const [tokenRecord] = await db.select().from(githubTokens).limit(1);

      if (tokenRecord) {
        console.log(`📡 [GitHub] Pushing webhook event ${event} to Hub...`);
        await axios.post(`${HUB_URL}/registry.dispatchWebhook`, {
          json: {
            clientId: process.env.DESEO_CLIENT_ID,
            clientSecret: process.env.DESEO_CLIENT_SECRET,
            appSlug: 'github-cms',
            event,
            payload: {
              userId: tokenRecord.deseoUserId,
              repository: repositoryFullName,
              ...payload,
            }
          }
        });
      } else {
        console.warn('⚠️ [GitHub] Webhook received but no user found in connector database.');
      }
    }

    // Always respond with 200 to GitHub
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ [GitHub] Webhook processing failed:', error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 10. Settings UI: repo + branch picker
app.get('/ui/settings', async (req, res) => {
  const { installationId } = req.query as { installationId: string };

  if (!installationId) {
    return res.status(400).send('Missing installationId');
  }

  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.installationId, installationId)).limit(1);

  if (!session) {
    return res.status(404).send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h2>Session not found. Please reconnect your GitHub account first.</h2>
        </body>
      </html>
    `);
  }

  let repos: any[] = [];
  try {
    const reposResponse = await axios.get('https://api.github.com/user/repos?per_page=100&sort=pushed', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    repos = reposResponse.data;
  } catch (err: any) {
    console.error('Failed to fetch repos for settings page:', err.message);
  }

  const [currentConfig] = await db.select().from(repoConfig).where(eq(repoConfig.deseoUserId, session.deseoUserId)).limit(1);

  const savedRepo = currentConfig?.repository ?? '';
  const savedBranch = currentConfig?.branch ?? '';

  const repoOptions = repos.map((r: any) => {
    const selected = r.full_name === savedRepo ? ' selected' : '';
    return `<option value="${r.full_name}"${selected}>${r.full_name}</option>`;
  }).join('\n');

  res.send(`
    <html>
      <head>
        <title>Configure GitHub CMS Connector</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f6f8fa; }
          .card { background: white; border-radius: 8px; padding: 32px; width: 100%; max-width: 480px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
          h1 { margin: 0 0 24px; font-size: 20px; }
          label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 600; color: #24292e; }
          select { width: 100%; padding: 8px 12px; border: 1px solid #d0d7de; border-radius: 6px; font-size: 14px; margin-bottom: 16px; background: white; }
          .row { display: flex; gap: 8px; align-items: flex-end; }
          .row select { margin-bottom: 0; flex: 1; }
          button { padding: 10px 20px; background: #24292e; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
          button:hover { background: #444d56; }
          button:disabled { opacity: 0.5; cursor: default; }
          #status { margin-top: 16px; font-size: 14px; }
          .success { color: #1a7f37; }
          .error { color: #cf222e; }
          .load-btn { background: #f6f8fa; color: #24292e; border: 1px solid #d0d7de; padding: 8px 14px; font-size: 13px; }
          .load-btn:hover { background: #e8eaed; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Configure GitHub CMS Connector</h1>

          <label for="repoSelect">Repository</label>
          <select id="repoSelect">
            <option value="">— Select a repository —</option>
            ${repoOptions}
          </select>

          <label for="branchSelect">Branch</label>
          <div class="row">
            <select id="branchSelect">
              <option value="">— Select a branch —</option>
            </select>
            <button class="load-btn" id="loadBranchesBtn" type="button">Load Branches</button>
          </div>
          <br/>

          <button id="saveBtn" type="button">Save Configuration</button>
          <div id="status"></div>
        </div>

        <script>
          const installationId = ${JSON.stringify(installationId)};
          const savedBranch = ${JSON.stringify(savedBranch)};

          async function loadBranches(repository, preselectBranch) {
            const branchSelect = document.getElementById('branchSelect');
            branchSelect.innerHTML = '<option value="">Loading...</option>';
            branchSelect.disabled = true;

            try {
              const resp = await fetch('/ui/settings/branches?installationId=' + encodeURIComponent(installationId) + '&repository=' + encodeURIComponent(repository));
              const data = await resp.json();

              if (data.success) {
                branchSelect.innerHTML = '<option value="">— Select a branch —</option>';
                data.data.forEach(function(b) {
                  const opt = document.createElement('option');
                  opt.value = b.name;
                  opt.textContent = b.name + (b.protected ? ' (protected)' : '');
                  if (b.name === preselectBranch) opt.selected = true;
                  branchSelect.appendChild(opt);
                });
              } else {
                branchSelect.innerHTML = '<option value="">Failed to load branches</option>';
              }
            } catch (e) {
              branchSelect.innerHTML = '<option value="">Error loading branches</option>';
            }

            branchSelect.disabled = false;
          }

          document.getElementById('repoSelect').addEventListener('change', function() {
            const repo = this.value;
            if (repo) {
              loadBranches(repo, '');
            } else {
              document.getElementById('branchSelect').innerHTML = '<option value="">— Select a branch —</option>';
            }
          });

          document.getElementById('loadBranchesBtn').addEventListener('click', function() {
            const repo = document.getElementById('repoSelect').value;
            if (repo) loadBranches(repo, document.getElementById('branchSelect').value);
          });

          document.getElementById('saveBtn').addEventListener('click', async function() {
            const repository = document.getElementById('repoSelect').value;
            const branch = document.getElementById('branchSelect').value;
            const status = document.getElementById('status');
            const btn = document.getElementById('saveBtn');

            if (!repository || !branch) {
              status.textContent = 'Please select a repository and branch.';
              status.className = 'error';
              return;
            }

            btn.disabled = true;
            status.textContent = 'Saving...';
            status.className = '';

            try {
              const resp = await fetch('/ui/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ installationId, repository, branch })
              });
              const data = await resp.json();

              if (data.success) {
                status.textContent = 'Configuration saved!';
                status.className = 'success';
                if (window.opener) {
                  window.opener.postMessage({ type: 'DESEO_SETTINGS_SAVED', app: 'github-cms' }, '*');
                }
                setTimeout(function() { window.close(); }, 1500);
              } else {
                status.textContent = 'Error: ' + (data.error || 'Unknown error');
                status.className = 'error';
              }
            } catch (e) {
              status.textContent = 'Network error. Please try again.';
              status.className = 'error';
            }

            btn.disabled = false;
          });

          // On page load, if a repo is already selected, auto-load its branches
          window.addEventListener('DOMContentLoaded', function() {
            const repoSelect = document.getElementById('repoSelect');
            if (repoSelect.value) {
              loadBranches(repoSelect.value, savedBranch);
            }
          });
        </script>
      </body>
    </html>
  `);
});

// 10a. Settings: Branches endpoint
app.get('/ui/settings/branches', async (req, res) => {
  const { installationId, repository } = req.query as { installationId: string; repository: string };

  if (!installationId || !repository) {
    return res.json({ success: false, error: 'Missing installationId or repository' });
  }

  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.installationId, installationId)).limit(1);

  if (!session) {
    return res.json({ success: false, error: 'Session not found' });
  }

  try {
    const branchesResponse = await axios.get(`https://api.github.com/repos/${repository}/branches`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });

    const branches = branchesResponse.data.map((b: any) => ({
      name: b.name,
      protected: b.protected,
    }));

    res.json({ success: true, data: branches });
  } catch (error: any) {
    console.error('Failed to fetch branches:', error.response?.data || error.message);
    res.json({ success: false, error: error.response?.data?.message || 'Failed to fetch branches' });
  }
});

// 10b. Settings: Save config
app.post('/ui/settings', async (req, res) => {
  const { installationId, repository, branch } = req.body;

  if (!installationId) {
    return res.status(400).json({ success: false, error: 'Missing installationId' });
  }

  const [session] = await db.select().from(githubTokens).where(eq(githubTokens.installationId, installationId)).limit(1);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  await db.insert(repoConfig).values({
    deseoUserId: session.deseoUserId,
    repository,
    branch,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: repoConfig.deseoUserId,
    set: { repository, branch, updatedAt: new Date() }
  });

  res.json({ success: true });
});

// 11. Feature: Get repo/branch config (SDK-protected)
app.get('/api/feature/git/config', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;

  const [config] = await db.select().from(repoConfig).where(eq(repoConfig.deseoUserId, userId)).limit(1);

  res.json({
    success: true,
    data: {
      repository: config?.repository ?? null,
      branch: config?.branch ?? null,
    }
  });
});

// 12. Feature: Set repo/branch config (SDK-protected)
app.post('/api/feature/git/config', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { repository, branch } = req.body;

  await db.insert(repoConfig).values({
    deseoUserId: userId,
    repository,
    branch,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: repoConfig.deseoUserId,
    set: { repository, branch, updatedAt: new Date() }
  });

  res.json({ success: true, data: { repository, branch } });
});

app.listen(PORT, () => {
  console.log(`🔌 GitHub Connector listening on http://localhost:${PORT}`);
});
