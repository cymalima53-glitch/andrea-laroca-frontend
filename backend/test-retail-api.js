const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api/orders/retail';

async function testRetailFlow() {
    try {
        console.log('🧪 Testing Retail Orders API...');

        // 1. Create Order
        console.log('\n📝 Creating test order...');
        const createRes = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: 'Test Setup User',
                customer_email: 'test@setup.com',
                customer_phone: '555-0199',
                shipping_address: '123 Test Lane',
                shipping_city: 'Test City',
                shipping_state: 'TS',
                shipping_zip: '12345',
                items: [{ product_id: 1, name: 'Test Bean', quantity: 1, price: 10.00 }],
                total: 10.00
            })
        });
        const created = await createRes.json();
        console.log('✅ Created:', created);

        if (!created.success) throw new Error('Failed to create order');
        const orderId = created.order.id;

        // 2. List Orders
        console.log('\n📋 Listing orders...');
        const listRes = await fetch(BASE_URL);
        const list = await listRes.json();
        console.log(`✅ Found ${list.orders.length} orders`);

        const found = list.orders.find(o => o.id === orderId);
        if (!found) throw new Error('Created order not found in list');
        console.log('✅ Verified order exists in list');

        // 3. Delete Order (Cleanup)
        console.log(`\n🗑️ Deleting order ${orderId}...`);
        const deleteRes = await fetch(`${BASE_URL}/${orderId}`, {
            method: 'DELETE'
        });
        const deleted = await deleteRes.json();
        console.log('✅ Deleted:', deleted);

        console.log('\n🎉 ALL TESTS PASSED! RETAIL ORDERS API IS READY.');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
    }
}

testRetailFlow();
