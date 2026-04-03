const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

console.log('--- DB DIAGNOSTIC START ---');
console.log('Attempting to connect with:');
console.log(`User: ${process.env.DB_USER}`);
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Port: ${process.env.DB_PORT}`);
console.log(`DB: postgres`);
// Not logging password for security, but checking if it exists
console.log(`Password provided: ${process.env.DB_PASSWORD ? 'YES' : 'NO'}`);

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('\nCONNECTION ERROR:');
        console.error(err);
        process.exit(1);
    }
    console.log('\nSUCCESS: Connected to postgres database!');
    release();
    process.exit(0);
});
