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

async function listAll() {
    try {
        console.log('--- ALL RETAIL ---');
        const retail = await fetch('http://localhost:5000/api/products');
        retail.forEach(p => console.log(`[${p.id}] ${p.name} | Price: ${p.price} | Img: ${p.image_url}`));

        console.log('\n--- ALL WHOLESALE ---');
        const catalogue = await fetch('http://localhost:5000/api/catalogue');
        catalogue.forEach(p => console.log(`[${p.id}] ${p.name} | Cat: ${p.category}`));

    } catch (e) {
        console.error(e);
    }
}

listAll();
