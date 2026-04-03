const http = require('http');

function fetch(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('JSON Parse Error:', data);
                    resolve([]);
                }
            });
        }).on('error', reject);
    });
}

async function diagnose() {
    try {
        console.log('Fetching Retail Products...');
        const retail = await fetch('http://localhost:5000/api/products');
        console.log(`Retail count: ${retail.length}`);

        // Check for ANY item with "cama"
        const cama = retail.find(p => p.name.toLowerCase().includes('cama'));
        if (cama) {
            console.log('Found CAMA in Retail:', cama);
            return;
        }

        // Check for recent items (last 3 IDs assuming incremental)
        const sorted = retail.sort((a, b) => b.id - a.id).slice(0, 3);
        console.log('Latest 3 Retail Items:', JSON.stringify(sorted, null, 2));

        console.log('Fetching Wholesale Catalogue...');
        const catalogue = await fetch('http://localhost:5000/api/catalogue');
        console.log(`Wholesale count: ${catalogue.length}`);

        const camaW = catalogue.find(p => p.name.toLowerCase().includes('cama'));
        if (camaW) {
            console.log('Found CAMA in Wholesale:', camaW);
        } else {
            console.log('CAMA not found in either.');
        }

    } catch (e) {
        console.error(e);
    }
}

diagnose();
