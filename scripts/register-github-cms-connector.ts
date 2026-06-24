import axios from 'axios';
import fs from 'fs';

async function register() {
  try {
    const response = await axios.post('http://localhost:3001/trpc/registry.registerApp', {
      json: {
        name: 'GitHub (CMS)',
        slug: 'github-cms',
        type: 'feature:git',
        baseUrl: 'http://localhost:3005',
        configUrl: '/ui/configure',
        settingsUrl: '/ui/settings',
        isInternal: true
      }
    });

    const data = response.data.result.data.json;
    console.log('✅ App Registered Successfully!');
    console.log('Client ID:', data.clientId);

    const envContent = `DESEO_CLIENT_ID=${data.clientId}\nDESEO_CLIENT_SECRET=${data.clientSecret}\nPORT=3005\nHUB_URL=http://localhost:3001/trpc`;
    fs.writeFileSync('apps/connector-github-cms/.env', envContent);
    console.log('📝 Saved credentials to apps/connector-github-cms/.env');
  } catch (error: any) {
    console.error('❌ Registration failed:', error.response?.data || error.message);
  }
}

register();
