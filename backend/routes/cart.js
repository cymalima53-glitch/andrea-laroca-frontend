const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const { cartItemSchema } = require('../utils/validationSchemas');

// Middleware: All cart routes require login
router.use(verifyToken);

// Helper: Get or Create Cart
const getOrCreateCart = async (userId) => {
    let cartResult = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
    if (cartResult.rows.length === 0) {
        cartResult = await pool.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING *', [userId]);
    }
    return cartResult.rows[0];
};

// @route   GET api/cart
// @desc    Get user's cart with product details
// @access  Private
router.get('/', async (req, res) => {
    try {
        const cart = await getOrCreateCart(req.user.id);

        const itemsQuery = `
            SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url as image
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = $1
            ORDER BY ci.id ASC
        `;
        const itemsResult = await pool.query(itemsQuery, [cart.id]);

        const items = itemsResult.rows.map(item => ({
            ...item,
            price: Number(item.price),
            subtotal: Number(item.price) * item.quantity
        }));

        res.json({ cartId: cart.id, items });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', async (req, res) => {
    try {
        const validation = cartItemSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.errors });
        }

        const { productId, quantity } = validation.data;
        const cart = await getOrCreateCart(req.user.id);

        // Check if item exists
        const itemCheck = await pool.query(
            'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2',
            [cart.id, productId]
        );

        if (itemCheck.rows.length > 0) {
            // Update quantity
            await pool.query(
                'UPDATE cart_items SET quantity = quantity + $1 WHERE cart_id = $2 AND product_id = $3',
                [quantity, cart.id, productId]
            );
        } else {
            // Insert new item
            await pool.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
                [cart.id, productId, quantity]
            );
        }

        res.json({ msg: 'Item added to cart' });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT api/cart/update
// @desc    Update item quantity by Item ID
// @access  Private
router.put('/update', async (req, res) => {
    try {
        const { itemId, quantity } = req.body;

        if (quantity < 1) return res.status(400).json({ msg: 'Quantity must be at least 1' });

        await pool.query(
            'UPDATE cart_items SET quantity = $1 WHERE id = $2',
            [quantity, itemId]
        );

        res.json({ msg: 'Cart updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE api/cart/:id
// @desc    Remove item from cart by Item ID
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'DELETE FROM cart_items WHERE id = $1',
            [id]
        );

        res.json({ msg: 'Item removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE api/cart/clear
// @desc    Clear entire cart
// @access  Private
router.delete('/clear', async (req, res) => {
    try {
        const cart = await getOrCreateCart(req.user.id);
        await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
        res.json({ msg: 'Cart cleared' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
