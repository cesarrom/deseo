import { db, users } from '../packages/db/src/index';
async function seed() {
    const [user] = await db.insert(users).values({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'test@example.com',
        name: 'Test User',
    }).onConflictDoNothing().returning();
    console.log('User seeded:', user || 'already exists');
    process.exit(0);
}
seed().catch(err => {
    console.error(err);
    process.exit(1);
});
