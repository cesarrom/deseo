import postgres from 'postgres';

const sql = postgres('postgres://deseo:deseo_dev_password@localhost:5432/deseo_dev');

async function check() {
  const users = await sql`SELECT id, email, name FROM users;`;
  console.log('Current Users in DB:', JSON.stringify(users, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
