import { db, apps, users } from '@deseo/db';
import { eq } from 'drizzle-orm';

export async function initializeConnectors() {
  console.log('🚀 Initializing system connectors...');

  // 1. Get a system user (or the first user) to own these apps
  const [systemUser] = await db.select().from(users).limit(1);
  if (!systemUser) {
    console.warn('⚠️ No users found in database. Skipping connector initialization.');
    return;
  }

  const connectors = [
    {
      name: 'GitHub',
      slug: 'github',
      type: 'feature:git' as const,
      baseUrl: process.env.CONNECTOR_GITHUB_BASE_URL || 'http://localhost:3002',
      configUrl: '/ui/configure',
      clientId: process.env.CONNECTOR_GITHUB_CLIENT_ID,
      clientSecret: process.env.CONNECTOR_GITHUB_CLIENT_SECRET,
      description: 'Automate SEO fixes directly in your codebase via Pull Requests.'
    },
    {
      name: 'Google Search Console',
      slug: 'gsc',
      type: 'feature:analytics' as const,
      baseUrl: process.env.CONNECTOR_GSC_BASE_URL || 'http://localhost:3003',
      configUrl: '/ui/configure',
      clientId: process.env.CONNECTOR_GSC_CLIENT_ID,
      clientSecret: process.env.CONNECTOR_GSC_CLIENT_SECRET,
      description: 'Track keyword performance and identify high-impact SEO opportunities.'
    },
    {
      name: 'Payload CMS',
      slug: 'payload',
      type: 'feature:cms' as const,
      baseUrl: process.env.CONNECTOR_PAYLOAD_BASE_URL || 'http://localhost:3004',
      configUrl: '/ui/configure',
      clientId: process.env.CONNECTOR_PAYLOAD_CLIENT_ID,
      clientSecret: process.env.CONNECTOR_PAYLOAD_CLIENT_SECRET,
      description: 'Publish AI-generated SEO content directly to your Payload CMS instance.'
    }
  ];

  for (const connector of connectors) {
    if (!connector.clientId || !connector.clientSecret) {
      console.warn(`⚠️ Skipping ${connector.name}: Missing client credentials in env.`);
      continue;
    }

    const [existing] = await db.select().from(apps).where(eq(apps.slug, connector.slug)).limit(1);

    if (existing) {
      console.log(`✅ Connector ${connector.name} already registered. Checking for updates...`);
      
      const needsUpdate = 
        existing.baseUrl !== connector.baseUrl ||
        existing.clientId !== connector.clientId ||
        existing.clientSecret !== connector.clientSecret ||
        existing.name !== connector.name ||
        existing.description !== connector.description;

      if (needsUpdate) {
        console.log(`🔄 Updating connector ${connector.name} configuration in database...`);
        await db.update(apps)
          .set({
            name: connector.name,
            baseUrl: connector.baseUrl,
            clientId: connector.clientId,
            clientSecret: connector.clientSecret,
            description: connector.description,
          })
          .where(eq(apps.slug, connector.slug));
      }
      continue;
    }

    console.log(`Registering ${connector.name}...`);
    await db.insert(apps).values({
      name: connector.name,
      slug: connector.slug,
      type: connector.type,
      baseUrl: connector.baseUrl,
      configUrl: connector.configUrl,
      clientId: connector.clientId,
      clientSecret: connector.clientSecret,
      description: connector.description,
      userId: systemUser.id,
      isInternal: 'true'
    });
  }

  console.log('✨ Connector initialization complete.');
}
