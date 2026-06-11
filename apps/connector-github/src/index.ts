import express from 'express';
import cors from 'cors';

import axios from 'axios';
import cookieParser from 'cookie-parser';



const app = express();
const PORT = process.env.PORT || 3002;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Simple In-Memory Token Store (In production, use a Database)
const tokenStore = new Map<string, { accessToken: string }>();

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
    
    // Store Deseo User ID in a secure cookie to link with GitHub later
    res.cookie('deseo_user_id', userId, { httpOnly: true, maxAge: 600000 }); // 10 mins

    // Show landing page to start GitHub OAuth
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>Connect GitHub</h1>
          <p>Deseo User Identified: <code>${userId}</code></p>
          <a href="https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user" 
             style="padding: 12px 24px; background: #24292e; color: white; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Authorize GitHub Access
          </a>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send('Deseo Identity exchange failed');
  }
});

// 2. GitHub OAuth Callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  const deseoUserId = req.cookies['deseo_user_id'];

  if (!code || !deseoUserId) return res.status(400).send('Session expired or missing code');

  try {
    // Exchange GitHub code for Access Token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token } = tokenResponse.data;

    // Link GitHub Token to Deseo User
    tokenStore.set(deseoUserId, { accessToken: access_token });
    console.log(`🔗 Linked GitHub token for Deseo User: ${deseoUserId}`);

    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>✅ GitHub Connected!</h1>
          <p>You can now close this window and return to Deseo.</p>
          <button onclick="window.location.href='http://localhost:3000/dashboard/settings'">Back to Dashboard</button>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('GitHub Authorization failed');
  }
});

// 3. Git Provider Action: List Repositories
app.get('/api/feature/git/repositories', async (req, res) => {
  const deseoUserId = req.headers['x-deseo-user-id'] as string;
  const session = tokenStore.get(deseoUserId);

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
app.post('/api/feature/git/pr', async (req, res) => {
  const deseoUserId = req.headers['x-deseo-user-id'] as string;
  const { repository, title, body, head, base } = req.body;
  const session = tokenStore.get(deseoUserId);

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
app.post('/api/feature/git/scan-and-fix', async (req, res) => {
  const deseoUserId = req.headers['x-deseo-user-id'] as string;
  const { repository } = req.body;
  const session = tokenStore.get(deseoUserId);

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

app.listen(PORT, () => {
  console.log(`🔌 GitHub Connector listening on http://localhost:${PORT}`);
});
