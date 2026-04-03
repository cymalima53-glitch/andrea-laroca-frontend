const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const pool = require('../db');

// @route   GET api/catalogue
// @desc    Get all catalogue items
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM catalogue';
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

// @route   GET api/catalogue/categories/list
// @desc    Get distinct categories
// @access  Public
router.get('/categories/list', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT category FROM catalogue');
        const categories = result.rows.map(row => row.category);
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/catalogue/:id
// @desc    Get catalogue item by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ msg: 'Invalid ID' });
        }

        const result = await pool.query('SELECT * FROM catalogue WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Item not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/catalogue
// @desc    Create a catalogue item
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, description, price, category, sku, unit, image_url, stock, nutrition_image_url, variants } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO catalogue (name, description, price, category, sku, unit, image_url, in_stock, nutrition_image_url, variants, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *',
            [name, description, price, category, sku, unit, image_url, stock > 0, nutrition_image_url || null, JSON.stringify(variants || [])]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/catalogue/:id
// @desc    Update a catalogue item
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { name, description, price, category, sku, unit, image_url, stock, nutrition_image_url, variants } = req.body;
    const { id } = req.params;

    // ── DIAGNOSTIC LOGGING ──────────────────────────────────────────────────
    console.log(`\n[PUT /api/catalogue/${id}] incoming variants:`);
    console.log('  type:', typeof variants);
    console.log('  isArray:', Array.isArray(variants));
    console.log('  length:', Array.isArray(variants) ? variants.length : 'N/A');
    console.log('  value:', JSON.stringify(variants));
    // ────────────────────────────────────────────────────────────────────────

    try {
        const variantsJson = JSON.stringify(variants || []);
        console.log(`  serialized for DB: ${variantsJson}`);

        const result = await pool.query(
            'UPDATE catalogue SET name = $1, description = $2, price = $3, category = $4, sku = $5, unit = $6, image_url = $7, in_stock = $8, nutrition_image_url = $9, variants = $10::jsonb, updated_at = NOW() WHERE id = $11 RETURNING *',
            [name, description, price, category, sku, unit, image_url, stock > 0, nutrition_image_url || null, variantsJson, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Item not found' });
        }

        const savedVariants = result.rows[0].variants;
        console.log(`  DB returned variants count: ${Array.isArray(savedVariants) ? savedVariants.length : 'NOT ARRAY'}`);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[PUT catalogue] ERROR:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/catalogue/:id
// @desc    Delete a catalogue item
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM catalogue WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Item not found' });
        }

        res.json({ msg: 'Item deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
