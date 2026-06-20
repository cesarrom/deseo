import axios from 'axios';
import fs from 'fs';

async function register() {
  try {
    const response = await axios.post('http://localhost:3001/trpc/registry.registerApp', {
      json: {
        name: 'Payload CMS',
        slug: 'payload',
        type: 'feature:cms',
        baseUrl: 'http://localhost:3004',
        configUrl: '/ui/configure',
        isInternal: true
      }
    });

    const data = response.data.result.data.json;
    console.log('✅ Payload App Registered Successfully!');
    console.log('Client ID:', data.clientId);
    
    const envContent = `DESEO_CLIENT_ID=${data.clientId}\nDESEO_CLIENT_SECRET=${data.clientSecret}\nPORT=3004\nHUB_URL=http://localhost:3001/trpc`;
    fs.writeFileSync('apps/connector-payload/.env', envContent);
    console.log('📝 Saved credentials to apps/connector-payload/.env');
  } catch (error: any) {
    console.error('❌ Registration failed:', error.response?.data || error.message);
  }
}

register();
