const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.dffixwgsqwmkwnvuuuef:QrShop2026Segura@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
});
async function main() {
  await client.connect();
  const res = await client.query('SELECT id, name, email, role, "telegramChatId" FROM "User"');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
