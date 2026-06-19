import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import Conf from 'conf';
import axios from 'axios';
import inquirer from 'inquirer';

const config = new Conf({ projectName: 'deseo-cli' });
const program = new Command();

const DEFAULT_HUB_URL = 'http://localhost:3001/trpc';

program
  .name('deseo')
  .description('Deseo Connector Development CLI')
  .version('0.1.0');

// Login Command
program
  .command('login')
  .description('Login to Deseo with an API Key')
  .argument('<key>', 'Your Deseo API Key')
  .action(async (key) => {
    try {
      const response = await axios.get(`${DEFAULT_HUB_URL}/auth.me`, {
        headers: { 'x-api-key': key }
      });
      
      const user = response.data.result.data.json;
      config.set('apiKey', key);
      config.set('user', user);
      
      console.log(chalk.green(`\n✅ Logged in as ${user.email}`));
    } catch (error) {
      console.error(chalk.red('\n❌ Login failed. Invalid API Key.'));
    }
  });

// Scaffolding Command
program
  .command('init')
  .description('Scaffold a new connector')
  .argument('<name>', 'Name of the connector (e.g., git-gitlab)')
  .option('-t, --type <type>', 'Type of connector: git, cms, or analytics')
  .action(async (name, options) => {
    let { type } = options;

    if (!type) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: 'What type of connector are you building?',
          choices: [
            { name: 'Git Provider (GitHub, GitLab, etc.)', value: 'feature:git' },
            { name: 'CMS Provider (Payload, WordPress, etc.)', value: 'feature:cms' },
            { name: 'Analytics Provider (GSC, GA4, etc.)', value: 'feature:analytics' },
          ],
        },
      ]);
      type = answers.type;
    }

    const targetDir = path.join(process.cwd(), `apps/connector-${name}`);
    
    if (await fs.pathExists(targetDir)) {
      console.error(chalk.red(`\n❌ Directory apps/connector-${name} already exists.`));
      process.exit(1);
    }

    console.log(chalk.blue(`\n🚀 Scaffolding ${type} connector in ${targetDir}...`));

    // Basic structure
    await fs.ensureDir(targetDir);
    await fs.ensureDir(path.join(targetDir, 'src'));

    // Create package.json
    const pkg = {
      name: `@deseo/connector-${name}`,
      version: '0.1.0',
      private: true,
      scripts: {
        "dev": "tsx watch src/index.ts",
        "register": "tsx scripts/register.ts"
      },
      dependencies: {
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "axios": "^1.6.0",
        "cookie-parser": "^1.4.6"
      },
      devDependencies: {
        "@types/express": "^4.17.21",
        "@types/cors": "^2.8.17",
        "@types/cookie-parser": "^1.4.6",
        "tsx": "^4.6.2",
        "typescript": "^5.3.3"
      }
    };
    await fs.writeJSON(path.join(targetDir, 'package.json'), pkg, { spaces: 2 });

    // Create placeholder index.ts based on type
    const templates: Record<string, string> = {
      'feature:git': `
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConnectorSDK } from '@deseo/connector-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const sdk = new ConnectorSDK(process.env.DESEO_CLIENT_SECRET!);
const app = express();
const PORT = process.env.PORT || 3000;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 1. Handshake Entrypoint
app.get('/ui/configure', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const response = await axios.post(\`\${HUB_URL}/registry.exchangeCode\`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        code: code as string,
      }
    });

    const { userId, installationId } = response.data.result.data.json;
    res.cookie('deseo_user_id', userId, { httpOnly: true });
    res.cookie('deseo_installation_id', installationId, { httpOnly: true });

    res.send(\`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>Connect ${name}</h1>
          <a href="/api/auth/start" style="padding: 12px 24px; background: #24292e; color: white; border-radius: 6px; text-decoration: none;">Authorize Git Access</a>
        </body>
      </html>
    \`);
  } catch (error) {
    res.status(500).send('Handshake failed');
  }
});

// 2. Git Provider Action: List Repositories
app.get('/api/feature/git/repositories', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  // TODO: Fetch from provider using stored tokens
  res.json({ success: true, data: [] });
});

// 3. Git Provider Action: Create Pull Request
app.post('/api/feature/git/pr', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { repository, title, body, head, base } = req.body;
  // TODO: Implement PR creation
  res.json({ success: true, data: { id: 'mock-pr-123', url: '#' } });
});

// 4. Git Provider Action: Dashboard Data
app.get('/api/feature/git/dashboard', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const repository = req.query.repository as string;
  // TODO: Fetch dashboard data from provider
  res.json({ 
    success: true, 
    data: { 
      recentCommits: [], 
      openPullRequests: [], 
      activityOverTime: [] 
    } 
  });
});

app.listen(PORT, () => {
  console.log(\`🔌 Git Connector ${name} listening on http://localhost:\${PORT}\`);
});
`,
      'feature:cms': `
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConnectorSDK } from '@deseo/connector-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const sdk = new ConnectorSDK(process.env.DESEO_CLIENT_SECRET!);
const app = express();
const PORT = process.env.PORT || 3000;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 1. Handshake Entrypoint
app.get('/ui/configure', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const response = await axios.post(\`\${HUB_URL}/registry.exchangeCode\`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        code: code as string,
      }
    });

    const { userId, installationId } = response.data.result.data.json;
    res.cookie('deseo_user_id', userId, { httpOnly: true });
    res.cookie('deseo_installation_id', installationId, { httpOnly: true });

    res.send(\`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>Connect ${name} CMS</h1>
          <form action="/ui/save" method="POST" style="display: flex; flex-direction: column; gap: 10px;">
            <input name="apiKey" type="password" placeholder="API Key" required />
            <button type="submit">Activate CMS</button>
          </form>
        </body>
      </html>
    \`);
  } catch (error) {
    res.status(500).send('Handshake failed');
  }
});

// 2. CMS Provider Action: Publish Article
app.post('/api/feature/cms/publish', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { title, slug, content } = req.body; // content is AST
  // TODO: Convert AST and publish to CMS
  res.json({ success: true, data: { id: 'mock-post-123', url: '#' } });
});

// 3. CMS Provider Action: Dashboard Data
app.get('/api/feature/cms/dashboard', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  // TODO: Fetch dashboard data from CMS
  res.json({ 
    success: true, 
    data: { 
      stats: { published: 0, drafts: 0, scheduled: 0 }, 
      recentArticles: [] 
    } 
  });
});

// 4. CMS Provider Action: Deep Sync Posts
app.get('/api/feature/cms/sync', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { collection } = req.query;
  // TODO: Fetch existing content from CMS in UnifiedPost format (content must be Lexical JSON)
  res.json({ success: true, data: [] });
});

app.listen(PORT, () => {
  console.log(\`🔌 CMS Connector ${name} listening on http://localhost:\${PORT}\`);
});
`,
      'feature:analytics': `
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConnectorSDK } from '@deseo/connector-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const sdk = new ConnectorSDK(process.env.DESEO_CLIENT_SECRET!);
const app = express();
const PORT = process.env.PORT || 3000;
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 1. Handshake Entrypoint
app.get('/ui/configure', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const response = await axios.post(\`\${HUB_URL}/registry.exchangeCode\`, {
      json: {
        clientId: process.env.DESEO_CLIENT_ID,
        clientSecret: process.env.DESEO_CLIENT_SECRET,
        code: code as string,
      }
    });

    const { userId, installationId } = response.data.result.data.json;
    res.cookie('deseo_user_id', userId, { httpOnly: true });
    res.cookie('deseo_installation_id', installationId, { httpOnly: true });

    res.send(\`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>Connect ${name} Analytics</h1>
          <a href="/api/auth/start" style="padding: 12px 24px; background: #4285F4; color: white; border-radius: 6px; text-decoration: none;">Authorize Analytics Access</a>
        </body>
      </html>
    \`);
  } catch (error) {
    res.status(500).send('Handshake failed');
  }
});

// 2. Analytics Provider Action: List Sites
app.get('/api/feature/analytics/sites', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  // TODO: Fetch sites from provider
  res.json({ success: true, data: [] });
});

// 3. Analytics Provider Action: Fetch Performance
app.post('/api/feature/analytics/performance', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { siteUrl, startDate, endDate } = req.body;
  // TODO: Query analytics data
  res.json({ success: true, data: [] });
});

// 4. Analytics Provider Action: Dashboard Data
app.get('/api/feature/analytics/dashboard', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const siteUrl = req.query.siteUrl as string;
  // TODO: Fetch dashboard data from provider
  res.json({ 
    success: true, 
    data: { 
      summary: { totalClicks: 0, totalImpressions: 0, averagePosition: 0, averageCTR: 0 }, 
      topKeywords: [], 
      trend: [] 
    } 
  });
});

// 5. Analytics Provider Action: Deep Sync Keywords
app.post('/api/feature/analytics/sync', sdk.authMiddleware(), async (req, res) => {
  const { userId } = (req as any).deseo;
  const { siteUrl, startDate, endDate } = req.body;
  // TODO: Fetch historical data in UnifiedKeywordData format
  res.json({ success: true, data: [] });
});

app.listen(PORT, () => {
  console.log(\`🔌 Analytics Connector ${name} listening on http://localhost:\${PORT}\`);
});
`
    };

    const template = templates[type] || templates['feature:git']!;
    await fs.writeFile(path.join(targetDir, 'src/index.ts'), template);

    // Create registration script
    const regScript = `
import axios from 'axios';
import fs from 'fs';

async function register() {
  try {
    const config = JSON.parse(fs.readFileSync('deseo.config.json', 'utf8'));
    const response = await axios.post('http://localhost:3001/trpc/registry.registerApp', {
      json: {
        ...config,
        isInternal: true
      }
    });

    const data = response.data.result.data.json;
    const envContent = \`DESEO_CLIENT_ID=\${data.clientId}\\nDESEO_CLIENT_SECRET=\${data.clientSecret}\\nPORT=\${config.port || 'PORT_HERE'}\\nHUB_URL=http://localhost:3001/trpc\`;
    fs.writeFileSync('.env', envContent);
    console.log('✅ Registered with Hub and saved .env');
  } catch (error: any) {
    console.error('❌ Registration failed:', error.response?.data || error.message);
  }
}
register();
`;
    await fs.ensureDir(path.join(targetDir, 'scripts'));
    await fs.writeFile(path.join(targetDir, 'scripts/register.ts'), regScript);

    // Create deseo.config.json
    const deseoConfig = {
      name: name.toUpperCase(),
      slug: name,
      type: type,
      baseUrl: 'http://localhost:3000',
      configUrl: '/ui/configure',
      port: 3000
    };
    await fs.writeJSON(path.join(targetDir, 'deseo.config.json'), deseoConfig, { spaces: 2 });

    console.log(chalk.green(`\n✨ Successfully scaffolded ${name}!`));
    console.log(`\nNext steps:\n1. cd apps/connector-${name}\n2. pnpm install\n3. Update deseo.config.json with your settings\n4. deseo register`);
  });

// Register Command
program
  .command('register')
  .description('Register the connector in the current directory with Deseo Hub')
  .option('--hub <url>', 'Override the Deseo Hub TRPC URL')
  .action(async (options) => {
    const apiKey = config.get('apiKey') as string;
    if (!apiKey) {
      console.error(chalk.red('\n❌ You must be logged in to register a connector. Run: deseo login <key>'));
      process.exit(1);
    }

    const configPath = path.join(process.cwd(), 'deseo.config.json');
    if (!await fs.pathExists(configPath)) {
      console.error(chalk.red('\n❌ deseo.config.json not found in current directory.'));
      process.exit(1);
    }

    try {
      const deseoConfig: any = await fs.readJSON(configPath);
      
      // Priority: 1. CLI Flag, 2. JSON Config, 3. Default
      const hubUrl = options.hub || deseoConfig.hubUrl || DEFAULT_HUB_URL;
      
      console.log(chalk.blue(`\n📡 Registering ${deseoConfig.name} at ${hubUrl}...`));

      // Extract known fields and treat everything else as extension flags
      const { port, hubUrl: _h, ...registrationData } = deseoConfig;

      const response = await axios.post(`${hubUrl}/registry.registerApp`, {
        json: {
          ...registrationData,
          isInternal: registrationData.isInternal ?? true
        }
      }, {
        headers: { 'x-api-key': apiKey }
      });

      const data = response.data.result.data.json;
      
      const envPath = path.join(process.cwd(), '.env');
      const envContent = `DESEO_CLIENT_ID=${data.clientId}\nDESEO_CLIENT_SECRET=${data.clientSecret}\nPORT=${port || 3000}\nHUB_URL=${hubUrl}`;
      
      await fs.writeFile(envPath, envContent);

      console.log(chalk.green(`\n✅ Connector registered successfully!`));
      console.log(chalk.gray(`📝 Saved credentials to .env`));
      console.log(`Client ID: ${data.clientId}`);
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Registration failed: ${error.response?.data?.result?.error?.message || error.message}`));
    }
  });

// Publish Command
program
  .command('publish')
  .description('Toggle the publication status of the connector')
  .action(async () => {
    const apiKey = config.get('apiKey') as string;
    if (!apiKey) {
      console.error(chalk.red('\n❌ You must be logged in to publish a connector. Run: deseo login <key>'));
      process.exit(1);
    }

    const configPath = path.join(process.cwd(), 'deseo.config.json');
    if (!await fs.pathExists(configPath)) {
      console.error(chalk.red('\n❌ deseo.config.json not found. Register the app first.'));
      process.exit(1);
    }

    try {
      const deseoConfig: any = await fs.readJSON(configPath);
      
      // 1. Find the app ID by slug
      const appResponse = await axios.get(`${DEFAULT_HUB_URL}/registry.getAppBySlug?batch=1&input=${JSON.stringify({ "0": { "slug": deseoConfig.slug } })}`, {
        headers: { 'x-api-key': apiKey }
      });
      
      const app = appResponse.data[0].result.data.json;

      // 2. Toggle status
      console.log(chalk.blue(`\n📡 Toggling publication for ${deseoConfig.name}...`));
      const toggleResponse = await axios.post(`${DEFAULT_HUB_URL}/registry.togglePublishApp`, {
        json: { id: app.id }
      }, {
        headers: { 'x-api-key': apiKey }
      });

      const isPublished = toggleResponse.data.result.data.json.isPublished;
      
      if (isPublished) {
        console.log(chalk.green(`\n🚀 Connector is now PUBLIC in the Marketplace!`));
      } else {
        console.log(chalk.yellow(`\n🔒 Connector is now PRIVATE.`));
      }
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Failed to toggle publication: ${error.message}`));
    }
  });

program.parse();
