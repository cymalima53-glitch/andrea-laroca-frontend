/**
 * debug-variants.js
 * Traces the full variant save/load flow directly against DB.
 * Run: node backend/debug-variants.js
 *
 * Tests:
 *  1. What does the DB currently store for products.variants column?
 *  2. Write 6 variants directly via SQL UPDATE — do they survive a SELECT?
 *  3. Simulate the PUT route logic exactly — do 6 variants survive JSON.stringify → DB → SELECT?
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    : new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
    });

const SIX_VARIANTS = [
    { size: '1lb',  type: 'Regular', price: 12 },
    { size: '1lb',  type: 'Decaf',   price: 13 },
    { size: '2lb',  type: 'Regular', price: 20 },
    { size: '2lb',  type: 'Decaf',   price: 21 },
    { size: '5lb',  type: 'Regular', price: 45 },
    { size: '5lb',  type: 'Decaf',   price: 47 },
];

async function run() {
    console.log('\n========================================');
    console.log(' VARIANT SAVE/LOAD DIAGNOSTIC');
    console.log('========================================\n');

    // ── STEP 1: Find a test product ──────────────────────────────────────────
    const { rows: products } = await pool.query('SELECT id, name, variants FROM products LIMIT 1');
    if (!products.length) {
        console.error('❌ No products found in DB. Nothing to test against.');
        return process.exit(1);
    }
    const product = products[0];
    console.log(`✅ Using product ID=${product.id} ("${product.name}")`);
    console.log(`   Current variants in DB: ${JSON.stringify(product.variants)}`);
    console.log(`   Current variant count: ${Array.isArray(product.variants) ? product.variants.length : 'NOT AN ARRAY — type: ' + typeof product.variants}\n`);

    // ── STEP 2: Check column type ────────────────────────────────────────────
    const { rows: colInfo } = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'variants'
    `);
    if (colInfo.length) {
        console.log(`📋 Column "variants" type: ${colInfo[0].data_type} (${colInfo[0].udt_name})`);
    } else {
        console.log('⚠️  Column "variants" NOT FOUND in products table!');
    }

    // ── STEP 3: Write 6 variants exactly as the PUT route does ───────────────
    console.log('\n--- WRITE TEST (simulating PUT route) ---');
    const serialized = JSON.stringify(SIX_VARIANTS);
    console.log(`   Sending JSON string (${serialized.length} chars): ${serialized}`);

    await pool.query(
        'UPDATE products SET variants = $1 WHERE id = $2',
        [serialized, product.id]
    );
    console.log('   ✅ UPDATE executed.');

    // ── STEP 4: Read back immediately ────────────────────────────────────────
    console.log('\n--- READ BACK TEST ---');
    const { rows: readBack } = await pool.query('SELECT id, variants FROM products WHERE id = $1', [product.id]);
    const savedVariants = readBack[0].variants;
    console.log(`   Raw value from DB: ${JSON.stringify(savedVariants)}`);
    console.log(`   Type: ${typeof savedVariants} | isArray: ${Array.isArray(savedVariants)}`);
    console.log(`   Count: ${Array.isArray(savedVariants) ? savedVariants.length : 'N/A'}`);

    // ── STEP 5: Verdict ──────────────────────────────────────────────────────
    console.log('\n--- VERDICT ---');
    if (Array.isArray(savedVariants) && savedVariants.length === SIX_VARIANTS.length) {
        console.log(`✅ DB correctly stored and returned ALL ${SIX_VARIANTS.length} variants.`);
        console.log('   → The bug is in the FRONTEND (variants are being truncated before the POST/PUT).');
        console.log('   → Add console.log(variants) right before the fetch() call in handleSubmit to confirm.');
    } else {
        const gotCount = Array.isArray(savedVariants) ? savedVariants.length : 0;
        console.log(`❌ DB returned ${gotCount} variants but we wrote ${SIX_VARIANTS.length}!`);
        console.log('   → The bug is in the DATABASE LAYER or column definition.');

        // extra: check if column is TEXT vs JSONB
        if (colInfo[0]?.data_type === 'text') {
            console.log('   ⚠️  COLUMN IS TEXT, not JSONB — pg might be parsing differently.');
        }
    }

    // ── STEP 6: Test catalogue too ───────────────────────────────────────────
    console.log('\n--- CATALOGUE TABLE CHECK ---');
    const { rows: catColInfo } = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'catalogue' AND column_name = 'variants'
    `);
    if (catColInfo.length) {
        console.log(`   catalogue.variants type: ${catColInfo[0].data_type} (${catColInfo[0].udt_name})`);
    } else {
        console.log('   ⚠️  "variants" column NOT in catalogue table!');
    }

    await pool.end();
    console.log('\n========================================\n');
}

run().catch(err => {
    console.error('Fatal error:', err);
    pool.end();
    process.exit(1);
});
