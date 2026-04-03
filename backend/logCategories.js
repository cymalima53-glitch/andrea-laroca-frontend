const fetch = require('node-fetch');

async function getCategories() {
    try {
        const response = await fetch('http://localhost:5000/api/retail/products');
        const data = await response.json();
        const categories = [...new Set(data.map(item => item.category))];
        console.log('Categories:', categories);
    } catch (error) {
        console.error('Error:', error);
    }
}

getCategories();
