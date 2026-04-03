const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const items = [
    // COFFEE
    { category: 'COFFEE', name: 'Passalacqua Espresso Beans (IBIS)', description: 'Premium blend', price: 'Request Quote' },
    { category: 'COFFEE', name: 'Passalacqua Espresso Beans (CREMADOR)', description: 'Premium blend', price: 'Request Quote' },
    { category: 'COFFEE', name: 'Passalacqua Espresso Beans (HARAM)', description: 'Premium blend', price: 'Request Quote' },
    { category: 'COFFEE', name: 'Passalacqua Nespresso Capsules', description: 'Compatible capsules', price: 'Request Quote' },
    { category: 'COFFEE', name: 'Passalacqua Pods', description: 'ESE Pods', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca Espresso Beans', description: 'Regular', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca Espresso Beans Decaf', description: 'Decaf', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca Pods', description: 'Regular', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca Pods Decaf', description: 'Decaf', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca Nespresso Capsules', description: 'Compatible capsules', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca American Coffee', description: '5lb bags, Regular', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca American Coffee Decaf', description: '5lb bags, Decaf', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca American Ground Bags', description: '2.5oz', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca American Ground Bags', description: '7oz', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca American Ground Bags Decaf', description: '2oz', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca Ice Tea', description: 'Black Tea, 32/4oz', price: 'Request Quote' },
    { category: 'COFFEE', name: 'LaRocca Ice Tea', description: 'Orange Pekoe, 96/1oz', price: 'Request Quote' },
    { category: 'COFFEE', name: 'Dover Ice Tea', description: 'Pekoe & Orange Pekoe 24/4oz', price: 'Request Quote' },
    { category: 'COFFEE', name: 'Hot Tea Bromeley', description: 'Assorted (Passion fruit, Darjeeling, Earl Grey, etc.)', price: 'Request Quote' },
    { category: 'COFFEE', name: 'Hot Tea China Mist', description: 'Assorted (Sweet Herbs, Ginger Turmeric, etc.)', price: 'Request Quote' },
    { category: 'COFFEE', name: 'Golden Bear Pancake Mix', description: 'Premium Mix', price: 'Request Quote' },

    // OIL
    { category: 'OIL', name: 'EVO Masseria Tin', description: '3lt', price: 'Request Quote' },
    { category: 'OIL', name: 'EVO Oroliveto Tin', description: '3lt', price: 'Request Quote' },
    { category: 'OIL', name: 'EVO Levante Tin', description: '3lt', price: 'Request Quote' },
    { category: 'OIL', name: 'EVO Oroliveto Bottle', description: '1lt', price: 'Request Quote' },
    { category: 'OIL', name: 'Pomace Bottle', description: '2lt', price: 'Request Quote' },
    { category: 'OIL', name: 'Primo Chef Blend Oil Bottle', description: '3lt', price: 'Request Quote' },
    { category: 'OIL', name: 'Sunflower Oil Bottle', description: '1lt', price: 'Request Quote' },

    // VINEGAR
    { category: 'VINEGAR', name: 'Varvelo Balsamic Vinegar', description: 'Traditional', price: 'Request Quote' },

    // PASTA
    { category: 'PASTA', name: 'Casa Vinicio Pasta', description: 'All shapes available', price: 'Request Quote' },
    { category: 'PASTA', name: 'LaRocca Pasta', description: 'All shapes available', price: 'Request Quote' },

    // RICE
    { category: 'RICE', name: 'Rice Arborio', description: '1kg', price: 'Request Quote' },
    { category: 'RICE', name: 'Rice Canarili', description: '1kg', price: 'Request Quote' },

    // TOMATO
    { category: 'TOMATO', name: 'Casa Vinicio Tomato Passata', description: 'Can 3.4kg', price: 'Request Quote' },
    { category: 'TOMATO', name: 'Casa Vinicio Tomato Pelati', description: 'Can 3.4kg', price: 'Request Quote' },

    // WATER
    { category: 'WATER', name: 'Ferrarelle Water', description: '750ml', price: 'Request Quote' },
    { category: 'WATER', name: 'Ferrarelle Water', description: '330ml', price: 'Request Quote' },

    // ARTICHOKES
    { category: 'ARTICHOKES', name: 'Artichoke Hearts', description: 'In jar 3kg', price: 'Request Quote' },
    { category: 'ARTICHOKES', name: 'Artichoke with Steam', description: 'Can 2.5kg', price: 'Request Quote' },

    // BEANS
    { category: 'BEANS', name: 'Cannellini Beans', description: '2.5kg', price: 'Request Quote' },

    // OLIVES
    { category: 'OLIVES', name: 'Pitted Green Olives', description: 'In jar 3kg', price: 'Request Quote' },

    // COCO WATER
    { category: 'COCO WATER', name: 'Coco Town', description: '1lt', price: 'Request Quote' },
    { category: 'COCO WATER', name: 'Coco Town', description: '330ml', price: 'Request Quote' },

    // FABBRI
    { category: 'FABBRI', name: 'Mixibar', description: 'Various kinds 1lt', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Amarena Jar', description: '230gr', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Strawberry', description: '230gr', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Ginger', description: '230gr', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Nevepanna', description: 'Premium', price: 'Request Quote' },
    { category: 'FABBRI', name: 'New York Cheesecake', description: 'Premium', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Pannamosse', description: 'Premium', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Simple Limoncello', description: 'Premium', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Simple Blood Orange', description: 'Premium', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Simple Crema Caffè', description: 'Premium', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Delipaste', description: 'Various kinds', price: 'Request Quote' },
    { category: 'FABBRI', name: 'Apricot Jam Bucket', description: '4.5kg', price: 'Request Quote' },

    // COOKIES
    { category: 'COOKIES', name: 'Falcone Amaretti', description: '1kg', price: 'Request Quote' },
    { category: 'COOKIES', name: 'Falcone Cantucci', description: '1kg', price: 'Request Quote' },
    { category: 'COOKIES', name: 'Ladyfingers Savoiardi', description: '400gr', price: 'Request Quote' },

    // CANNOLI
    { category: 'CANNOLI', name: 'Leone Cannoli Shells Large', description: '100 counts', price: 'Request Quote' },
    { category: 'CANNOLI', name: 'Leone Cannoli Shells Small', description: '220 counts', price: 'Request Quote' },

    // REFRIGERATED
    { category: 'REFRIGERATED', name: 'Clai Salame Nobile', description: 'Cured Meat', price: 'Request Quote' },
    { category: 'REFRIGERATED', name: 'Clai Spianata Piccante', description: 'Cured Meat', price: 'Request Quote' },
    { category: 'REFRIGERATED', name: 'Clai Guanciale', description: 'Cured Meat', price: 'Request Quote' },
    { category: 'REFRIGERATED', name: 'Clai Prosciutto di Parma', description: '20 months', price: 'Request Quote' },
    { category: 'REFRIGERATED', name: 'Zuarina Prosciutto di Parma', description: '20 months', price: 'Request Quote' },

    // FROZEN
    { category: 'FROZEN', name: 'Frozen Burrata', description: 'Premium', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Frozen Fior di Latte Mozzarella', description: 'Premium', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Frozen Smoked Provola', description: 'Premium', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Frozen Buffalo Mozzarella', description: 'Premium', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Frozen Octopus', description: '4/6 & 6/8 lb', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Frozen Calamari', description: 'Premium', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Frozen Shrimp & Tiger Shrimp', description: 'Premium', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Frozen Pinsa Romana', description: 'Premium', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Delizia al Limone', description: 'Dessert by Marigliano', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Babà', description: 'Dessert by Marigliano', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Tiramisu', description: 'Dessert by Marigliano', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Cheesecake', description: 'Dessert by Marigliano', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Torta Della Nonna', description: 'Cake', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Cubana', description: 'Cake', price: 'Request Quote' },
    { category: 'FROZEN', name: 'Tris Cioccolato', description: 'Cake', price: 'Request Quote' },

    // PAPER GOODS
    { category: 'PAPER GOODS', name: 'Gloves', description: 'S, M, L, XL', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Garbage Bags', description: '45/55/60G', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Paper Cups', description: '4/10/12/16oz', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Plastic Cups', description: '16oz', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Lids', description: '12/16oz', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Cup Sleeves', description: 'Universal', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Containers to Go', description: 'Various sizes', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Napkins', description: 'Premium', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Paper Towels', description: 'Premium', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Toilet Paper', description: 'Commercial', price: 'Request Quote' },
    { category: 'PAPER GOODS', name: 'Thank You Bags', description: 'Standard', price: 'Request Quote' },
];

(async () => {
    const client = await pool.connect();
    try {
        console.log("Seeding Catalogue...");
        await client.query('BEGIN');

        // Clear existing just in case (though table recreate handles it)
        await client.query('TRUNCATE catalogue RESTART IDENTITY');

        for (const item of items) {
            await client.query(
                `INSERT INTO catalogue (category, name, description, price, in_stock) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [item.category, item.name, item.description, item.price, true]
            );
        }

        await client.query('COMMIT');
        console.log(`✅ Seeded ${items.length} items successfully.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error seeding catalogue:", err);
    } finally {
        client.release();
        pool.end();
    }
})();
