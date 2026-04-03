const { pool } = require('./db');

async function checkOrdersSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders'
        `);
        console.log('Columns in ORDERS table:');
        res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkOrdersSchema();
