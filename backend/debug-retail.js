const fetch = require('node-fetch');

async function debugRetail() {
    console.log('🔍 Debugging Retail API...');

    try {
        // 1. Check GET endpoint response structure
        const res = await fetch('http://localhost:5000/api/orders/retail');
        console.log(`Status: ${res.status}`);

        const data = await res.json();
        console.log('Response Body:', JSON.stringify(data, null, 2));

        if (!data.success) {
            console.error('❌ API Error:', data.error);
        } else {
            console.log('✅ API is fetching correctly!');
        }

    } catch (e) {
        console.error('❌ Request Failed:', e.message);
    }
}

debugRetail();
