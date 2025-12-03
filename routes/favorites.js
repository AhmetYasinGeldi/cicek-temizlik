const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// Favoriler tablosunu oluştur
pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        product_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
`).catch(err => console.error('Favorites tablo oluşturma hatası:', err));

// Kullanıcının tüm favorilerini getir
router.get('/', authenticateToken, async (req, res) => {
    if (req.user.role === 'admin') {
        return res.status(403).json({ message: 'Admin kullanıcılar favori özelliğini kullanamaz' });
    }

    const query = `
        SELECT p.*, f.created_at as favorited_at
        FROM favorites f
        JOIN products p ON f.product_id = p.id
        WHERE f.user_id = $1
        ORDER BY f.created_at DESC
    `;

    try {
        const result = await pool.query(query, [req.user.userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Favoriler alınırken hata:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// Favori ekle
router.post('/:productId', authenticateToken, async (req, res) => {
    if (req.user.role === 'admin') {
        return res.status(403).json({ message: 'Admin kullanıcılar favori özelliğini kullanamaz' });
    }

    const productId = parseInt(req.params.productId);

    try {
        // Önce ürünün var olup olmadığını kontrol et
        const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
        
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        // Favoriye ekle
        const query = 'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) RETURNING id';
        const result = await pool.query(query, [req.user.userId, productId]);
        
        res.status(201).json({ message: 'Ürün favorilere eklendi', favoriteId: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') { // PostgreSQL unique constraint error code
            return res.status(400).json({ message: 'Bu ürün zaten favorilerinizde' });
        }
        console.error('Favori ekleme hatası:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// Favori çıkar
router.delete('/:productId', authenticateToken, async (req, res) => {
    if (req.user.role === 'admin') {
        return res.status(403).json({ message: 'Admin kullanıcılar favori özelliğini kullanamaz' });
    }

    const productId = parseInt(req.params.productId);
    const query = 'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2';

    try {
        const result = await pool.query(query, [req.user.userId, productId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Bu ürün favorilerinizde değil' });
        }
        
        res.json({ message: 'Ürün favorilerden çıkarıldı' });
    } catch (err) {
        console.error('Favori silme hatası:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// Ürünün favoride olup olmadığını kontrol et
router.get('/check/:productId', authenticateToken, async (req, res) => {
    if (req.user.role === 'admin') {
        return res.json({ isFavorite: false });
    }

    const productId = parseInt(req.params.productId);
    const query = 'SELECT id FROM favorites WHERE user_id = $1 AND product_id = $2';

    try {
        const result = await pool.query(query, [req.user.userId, productId]);
        res.json({ isFavorite: result.rows.length > 0 });
    } catch (err) {
        console.error('Favori kontrol hatası:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
