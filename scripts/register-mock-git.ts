import axios from 'axios';
import fs from 'fs';

async function register() {
  try {
    const response = await axios.post('http://localhost:3001/trpc/registry.registerApp', {
      json: {
        name: 'Mock Git Connector',
        slug: 'mock-git',
        type: 'feature:git',
        baseUrl: 'http://localhost:3005',
        configUrl: '/ui/configure',
        isInternal: true
      }
    });

    const data = response.data.result.data.json;
    console.log('✅ Mock Git App Registered Successfully!');
    console.log('Client ID:', data.clientId);
    
    const envContent = `DESEO_CLIENT_ID=${data.clientId}\nDESEO_CLIENT_SECRET=${data.clientSecret}\nPORT=3005\nHUB_URL=http://localhost:3001/trpc`;
    fs.writeFileSync('apps/connector-mock/.env', envContent);
    console.log('📝 Saved credentials to apps/connector-mock/.env');
  } catch (error: any) {
    console.error('❌ Registration failed:', error.response?.data || error.message);
  }
}

register();
