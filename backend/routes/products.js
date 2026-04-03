const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const pool = require('../db');

// @route   GET api/products
// @desc    Get all products
// @access  Public (or Private depending on needs, usually public for shop, but maybe private for admin full view? user said 46 pre-loaded)
// User brief says: GET /api/products - Fetch all products (with category filter)
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM products';
        let params = [];

        if (category) {
            query += ' WHERE category = $1';
            params.push(category);
        }

        query += ' ORDER BY id ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// @route   GET api/products/categories/list
// @desc    Get distinct categories
// @access  Public
router.get('/categories/list', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT category FROM products');
        const categories = result.rows.map(row => row.category);
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if id is distinct categories, if so we skip (but order matters in express, put specific routes first!)
        // 'categories/list' will match :id if defined after. I put categories/list BEFORE :id in my plan below?
        // Let's check existing file. categories/list is defined.

        // Postgres integer check for ID? Or UUID? Schema used SERIAL (int).
        if (isNaN(id)) {
            // If it's not a number, it might be a sub-route that matched. 
            // Express router matches in order. 
            // categories/list is already defined above? I need to check order.
            return res.status(400).json({ msg: 'Invalid ID' });
        }

        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/products
// @desc    Create a product
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, description, price, category, sku, unit, image_url, stock, nutrition_image_url, variants } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, price, category, sku, unit, image_url, in_stock, nutrition_image_url, variants) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [name, description, price, category, sku, unit, image_url, stock > 0, nutrition_image_url || null, JSON.stringify(variants || [])]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/products/:id
// @desc    Update a product
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { name, description, price, category, sku, unit, image_url, stock, nutrition_image_url, variants } = req.body;
    const { id } = req.params;

    try {
        console.log('All variants:', req.body.variants);
        const variantsToSave = JSON.stringify(variants || []);
        console.log('Saving:', variantsToSave);

        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, category = $4, sku = $5, unit = $6, image_url = $7, in_stock = $8, nutrition_image_url = $9, variants = $10 WHERE id = $11 RETURNING *',
            [name, description, price, category, sku, unit, image_url, stock > 0, nutrition_image_url || null, variantsToSave, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/products/:id
// @desc    Delete a product
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        res.json({ msg: 'Product deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
