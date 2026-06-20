import { db } from './index';
import { articles } from './schema/articles';

async function main() {
  try {
    const results = await db.select().from(articles);
    console.log('Total articles found:', results.length);
    for (const r of results) {
      console.log(`\n========================================`);
      console.log(`Article ID: ${r.id}`);
      console.log(`Title: ${r.title}`);
      console.log(`Slug: ${r.slug}`);
      console.log(`Target CMS: ${r.targetCms}`);
      console.log(`Status: ${r.status}`);
      console.log(`Type of astContent: ${typeof r.astContent}`);
      console.log(`astContent:`, JSON.stringify(r.astContent));
    }
  } catch (error) {
    console.error('Error querying database:', error);
  }
}

main();
