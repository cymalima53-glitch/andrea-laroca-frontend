const fetch = require('node-fetch'); // Might need dynamic import if node-fetch v3, but v2 is common. Or use native fetch in Node 18+

async function check() {
    try {
        const res = await fetch('http://localhost:5000/api/products');
        const data = await res.json();
        console.log('Total Products:', data.length);
        if (data.length > 0) {
            console.log('Last Product:', data[data.length - 1]);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}
check();
