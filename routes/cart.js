const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const { getSettings } = require('../settingsHelper');

router.post('/items', authenticateToken, async (req, res) => {
    const userId = req.user.userId; 
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
        return res.status(400).json({ error: 'Geçersiz ürün ID\'si veya miktar.' });
    }

    try {
        
        const settings = await getSettings();
        if (!settings.sales_active) {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Sistem şu anda satışa kapalıdır.' });
            }
        }

        const stockCheck = await pool.query('SELECT stock_quantity FROM products WHERE id = $1 AND is_active = true', [productId]);
        
        if (stockCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Ürün bulunamadı veya satışta değil.' });
        }
        const availableStock = stockCheck.rows[0].stock_quantity;

        const cartItemCheck = await pool.query(
            `SELECT ci.quantity FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = $1 AND ci.product_id = $2`,
            [userId, productId]
        );
        const quantityInCart = cartItemCheck.rows.length > 0 ? cartItemCheck.rows[0].quantity : 0;
        
        if (availableStock < (quantityInCart + quantity)) {
            const canAdd = availableStock - quantityInCart;
            if (canAdd <= 0) {
                return res.status(400).json({ error: `Stok tükendi! Bu üründen daha fazla ekleyemezsiniz.` });
            }
            return res.status(400).json({ error: `Yetersiz stok! Bu üründen en fazla ${canAdd} adet daha ekleyebilirsiniz.` });
        }
        let cartResult = await pool.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
        let cartId;

        if (cartResult.rows.length > 0) {
            cartId = cartResult.rows[0].id;
        } else {
            const newCartResult = await pool.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
            cartId = newCartResult.rows[0].id;
        }

        const upsertQuery = `
            INSERT INTO cart_items (cart_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (cart_id, product_id)
            DO UPDATE SET quantity = cart_items.quantity + $3
            RETURNING *;
        `;
        
        const cartItemResult = await pool.query(upsertQuery, [cartId, productId, quantity]);

        res.status(201).json(cartItemResult.rows[0]);

    } catch (err) {
        console.error('Sepete eklerken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        const query = `
            SELECT 
                p.id, 
                p.name, 
                p.price, 
                ci.quantity 
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = $1;
        `;

        const cartItemsResult = await pool.query(query, [userId]);

        res.status(200).json(cartItemsResult.rows);

    } catch (err) {
        console.error('Sepet getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu' });
    }
});

router.put('/items/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: 'Geçersiz miktar.' });
    }

    try {

        const settings = await getSettings();
        if (!settings.sales_active) {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Sistem şu anda satışa kapalıdır.' });
            }
        }

        if (quantity > 0) {
            const stockCheck = await pool.query('SELECT stock_quantity FROM products WHERE id = $1 AND is_active = true', [productId]);
            
            if (stockCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Ürün bulunamadı veya satışta değil.' });
            }
    
            const availableStock = stockCheck.rows[0].stock_quantity;
            if (availableStock < quantity) {
                return res.status(400).json({ error: `Yetersiz stok! Bu üründen en fazla ${availableStock} adet sepete ekleyebilirsiniz.` });
            }
        }

        const cartResult = await pool.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
        if (cartResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcının sepeti bulunamadı.' });
        }
        const cartId = cartResult.rows[0].id;

        let updatedItem;
        if (quantity === 0) {
            updatedItem = await pool.query(
                'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 RETURNING *',
                [cartId, productId]
            );
        } else {
            updatedItem = await pool.query(
                'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3 RETURNING *',
                [quantity, cartId, productId]
            );
        }

        if (updatedItem.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek ürün sepette bulunamadı.' });
        }

        res.status(200).json(updatedItem.rows[0]);

    } catch (err) {
        console.error('Sepet güncellenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu' });
    }
});


router.delete('/items/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params;

    try {
        const cartResult = await pool.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
        if (cartResult.rows.length === 0) {
            return res.status(404).json({ error: 'Silinecek ürün bulunamadı.' });
        }
        const cartId = cartResult.rows[0].id;

        const deleteResult = await pool.query(
            'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 RETURNING *',
            [cartId, productId]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Silinecek ürün sepette bulunamadı.' });
        }

        res.status(204).send();

    } catch (err) {
        console.error('Sepetten silerken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu' });
    }
});

module.exports = router;