const http = require('http');

function request(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function testAndFix() {
    try {
        console.log('1. Checking Server Health...');
        const health = await request('/');
        console.log(`   Status: ${health.status}`);
        console.log(`   Response: ${health.data}`);

        if (health.status !== 200) {
            console.error('❌ Server not healthy or not reachable at port 5000');
            return;
        }

        console.log('\n2. Triggering Schema Update...');
        const update = await request('/api/setup/add-catalogue-column', 'POST');
        console.log(`   Status: ${update.status}`);
        console.log(`   Response: ${update.data}`);

    } catch (e) {
        console.error('❌ Network Error:', e.message);
    }
}

testAndFix();
