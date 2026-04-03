/**
 * debug-catalogue-variants.js
 * Direct DB probe: check what's stored for catalogue item, then do a test save.
 * Run: node backend/debug-catalogue-variants.js [id]
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    : new Pool({ user: process.env.DB_USER, host: process.env.DB_HOST || 'localhost', database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT || 5432 });

const targetId = process.argv[2] || null;

async function run() {
    console.log('\n=== CATALOGUE VARIANTS DIAGNOSTIC ===\n');

    // ── 1. List recent catalogue items ──────────────────────────────────────
    const { rows: items } = await pool.query(
        'SELECT id, name, variants FROM catalogue ORDER BY id DESC LIMIT 10'
    );
    console.log('Recent catalogue items:');
    items.forEach(r => {
        const v = r.variants;
        const count = Array.isArray(v) ? v.length : (v ? 'non-array: ' + typeof v : 'NULL');
        console.log(`  id=${r.id} | "${r.name}" | variants count: ${count}`);
    });

    // ── 2. Check specific item if ID given ───────────────────────────────────
    const checkId = targetId || (items[0] && items[0].id);
    if (checkId) {
        console.log(`\n--- Current DB state for id=${checkId} ---`);
        const { rows } = await pool.query('SELECT id, name, variants FROM catalogue WHERE id = $1', [checkId]);
        if (rows.length) {
            const r = rows[0];
            console.log(`  name: ${r.name}`);
            console.log(`  variants raw: ${JSON.stringify(r.variants)}`);
            console.log(`  variants count: ${Array.isArray(r.variants) ? r.variants.length : 'NOT ARRAY'}`);
        } else {
            console.log(`  No item found with id=${checkId}`);
        }

        // ── 3. Test write 3 variants directly ────────────────────────────────
        console.log(`\n--- WRITE TEST: saving 3 variants to id=${checkId} ---`);
        const testVariants = [
            { size: 'Small', type: 'Original', price: 10 },
            { size: 'Medium', type: 'Original', price: 20 },
            { size: 'Large', type: 'Original', price: 30 },
        ];
        const jsonStr = JSON.stringify(testVariants);
        console.log(`  Sending: ${jsonStr}`);

        await pool.query(
            'UPDATE catalogue SET variants = $1 WHERE id = $2',
            [jsonStr, checkId]
        );

        const { rows: after } = await pool.query('SELECT variants FROM catalogue WHERE id = $1', [checkId]);
        const saved = after[0]?.variants;
        console.log(`  After save: ${JSON.stringify(saved)}`);
        console.log(`  Count: ${Array.isArray(saved) ? saved.length : 'NOT ARRAY'}`);

        if (Array.isArray(saved) && saved.length === 3) {
            console.log('\n✅ DB layer works — 3 variants saved and read back correctly.');
            console.log('   → Bug is in the PUT route: variants are NOT arriving in req.body,');
            console.log('     OR the frontend is sending parsedVariants=[] (empty after filter).');
            console.log('\n   ACTION: Check the backend route console for incoming req.body.variants');
            console.log('   (logging has been added to routes/catalogue.js PUT endpoint)');
        } else {
            console.log('\n❌ DB layer is broken — variants not persisting. Schema issue?');
        }
    }

    // ── 4. Confirm column type ────────────────────────────────────────────────
    const { rows: col } = await pool.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name='catalogue' AND column_name='variants'
    `);
    console.log(`\n--- Column type ---`);
    console.log(col.length ? `  variants: ${col[0].data_type}` : '  ⚠️  variants column NOT FOUND in catalogue table!');

    await pool.end();
    console.log('\n=====================================\n');
}

run().catch(err => { console.error('Error:', err.message); pool.end(); });
