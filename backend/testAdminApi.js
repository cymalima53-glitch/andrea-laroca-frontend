const fetch = require('node-fetch');

async function runTest() {
    try {
        console.log('Testing Admin API...');

        // 0. Register a new user
        const email = `test${Date.now()}@example.com`;
        const regRes = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Integration Test User',
                email: email,
                password: 'password123',
                company_name: 'Test Corp',
                phone: '1234567890',
                address: '123 Test St',
                business_type: 'Restaurant',
                inquiry_type: 'New Customer'
            })
        });

        if (!regRes.ok) {
            console.error('Registration Failed:', await regRes.text());
        }
        const regData = await regRes.json();
        const newUserId = regData.user.id;
        console.log('Registered User:', newUserId);

        // 1. Login
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@larocca.com', password: 'admin123' })
        });

        if (!loginRes.ok) {
            console.error('Login Failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const accessToken = loginData.accessToken || loginData.token;
        console.log('Got Admin Token:', accessToken ? 'YES' : 'NO');

        // 2. Approve
        console.log('Approving user:', newUserId);
        const approveRes = await fetch(`http://localhost:5000/api/admin/users/approve/${newUserId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log('Approve Status:', approveRes.status);
        console.log('Approve Body:', await approveRes.text());

    } catch (err) {
        console.error('Test Error:', err);
    }
}

runTest();
