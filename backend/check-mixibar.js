require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({ user: process.env.DB_USER, host: process.env.DB_HOST||'localhost', database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT||5432 });

async function run() {
  // Find Mixibar
  const { rows } = await pool.query("SELECT id, name, variants FROM catalogue WHERE name ILIKE '%mixi%'");
  console.log('Mixibar items found:', rows.length);
  rows.forEach(function(r) {
    console.log('  id=' + r.id + ' name=' + r.name);
    console.log('  variants type:', typeof r.variants);
    console.log('  variants isArray:', Array.isArray(r.variants));
    console.log('  variants count:', Array.isArray(r.variants) ? r.variants.length : 'NOT ARRAY');
    console.log('  variants:', JSON.stringify(r.variants));

    // If Mixibar found, do a test write
    if (r.id) {
      const testId = r.id;
      const testVariants = JSON.stringify([
        { size: 'One', type: 'Flavour A', price: 0 },
        { size: 'One', type: 'Flavour B', price: 0 },
        { size: 'One', type: 'Flavour C', price: 0 },
      ]);
      console.log('\n  TEST WRITE: sending', testVariants);
      pool.query('UPDATE catalogue SET variants = $1 WHERE id = $2 RETURNING variants', [testVariants, testId])
        .then(function(result) {
          const saved = result.rows[0].variants;
          console.log('  AFTER WRITE:', JSON.stringify(saved));
          console.log('  Count:', Array.isArray(saved) ? saved.length : 'NOT ARRAY');
          pool.end();
        })
        .catch(function(err) { console.error('Write error:', err.message); pool.end(); });
    }
  });

  if (rows.length === 0) {
    // Show all items
    const all = await pool.query('SELECT id, name FROM catalogue ORDER BY id DESC LIMIT 20');
    console.log('No Mixibar found. All items:');
    all.rows.forEach(function(r) { console.log('  id=' + r.id + ' ' + r.name); });
    await pool.end();
  }
}
run().catch(function(e) { console.error(e.message); pool.end(); });
