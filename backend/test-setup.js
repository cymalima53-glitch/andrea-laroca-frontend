// Simple test to create retail_orders table via API
const fetch = require('node-fetch');

async function setupTable() {
    try {
        console.log('📡 Calling setup endpoint...');
        const response = await fetch('http://localhost:5000/api/setup/setup-retail-orders', {
            method: 'POST'
        });

        const data = await response.json();
        console.log('✅ Response:', data);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

setupTable();
