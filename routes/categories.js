const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// Sadece admin kontrolü için middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    next();
};

// Tüm kategorileri getir (Herkes görebilir)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Kategoriler getirilirken hata:', error);
        res.status(500).json({ error: 'Kategoriler getirilemedi.' });
    }
});

// Belirli bir kategorinin detaylarını getir (ürünleriyle birlikte)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kategori bilgisi
        const categoryResult = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
        if (categoryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kategori bulunamadı.' });
        }
        
        // Bu kategorideki ürünler
        const productsResult = await pool.query(`
            SELECT p.* FROM products p
            INNER JOIN product_categories pc ON p.id = pc.product_id
            WHERE pc.category_id = $1
            ORDER BY p.name ASC
        `, [id]);
        
        res.json({
            category: categoryResult.rows[0],
            products: productsResult.rows
        });
    } catch (error) {
        console.error('Kategori detayları getirilirken hata:', error);
        res.status(500).json({ error: 'Kategori detayları getirilemedi.' });
    }
});

// Yeni kategori ekle (Sadece admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Kategori adı gerekli.' });
        }
        
        const result = await pool.query(
            'INSERT INTO categories (name) VALUES ($1) RETURNING *',
            [name.trim()]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Kategori eklenirken hata:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ error: 'Bu kategori adı zaten mevcut.' });
        }
        res.status(500).json({ error: 'Kategori eklenemedi.' });
    }
});

// Kategori güncelle (Sadece admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Kategori adı gerekli.' });
        }
        
        const result = await pool.query(
            'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
            [name.trim(), id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Kategori bulunamadı.' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Kategori güncellenirken hata:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Bu kategori adı zaten mevcut.' });
        }
        res.status(500).json({ error: 'Kategori güncellenemedi.' });
    }
});

// Kategori sil (Sadece admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Kategori bulunamadı.' });
        }
        
        res.json({ message: 'Kategori silindi.', category: result.rows[0] });
    } catch (error) {
        console.error('Kategori silinirken hata:', error);
        res.status(500).json({ error: 'Kategori silinemedi.' });
    }
});

// Ürünün kategorilerini getir
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        
        const result = await pool.query(`
            SELECT c.* FROM categories c
            INNER JOIN product_categories pc ON c.id = pc.category_id
            WHERE pc.product_id = $1
            ORDER BY c.name ASC
        `, [productId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Ürün kategorileri getirilirken hata:', error);
        res.status(500).json({ error: 'Ürün kategorileri getirilemedi.' });
    }
});

// Ürüne kategori ekle (Sadece admin)
router.post('/product/:productId/category/:categoryId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { productId, categoryId } = req.params;
        
        await pool.query(
            'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)',
            [productId, categoryId]
        );
        
        res.status(201).json({ message: 'Kategori ürüne eklendi.' });
    } catch (error) {
        console.error('Ürüne kategori eklenirken hata:', error);
        if (error.code === '23505') { // Already exists
            return res.status(409).json({ error: 'Bu kategori zaten ürüne ekli.' });
        }
        res.status(500).json({ error: 'Kategori ürüne eklenemedi.' });
    }
});

// Üründen kategori kaldır (Sadece admin)
router.delete('/product/:productId/category/:categoryId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { productId, categoryId } = req.params;
        
        const result = await pool.query(
            'DELETE FROM product_categories WHERE product_id = $1 AND category_id = $2',
            [productId, categoryId]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Bu ilişki bulunamadı.' });
        }
        
        res.json({ message: 'Kategori üründen kaldırıldı.' });
    } catch (error) {
        console.error('Üründen kategori kaldırılırken hata:', error);
        res.status(500).json({ error: 'Kategori üründen kaldırılamadı.' });
    }
});

// Çoklu ürünlere kategori ekle (Sadece admin)
router.post('/bulk-assign', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { productIds, categoryId } = req.body;
        
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'Ürün ID\'leri gerekli.' });
        }
        
        if (!categoryId) {
            return res.status(400).json({ error: 'Kategori ID gerekli.' });
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            let addedCount = 0;
            for (const productId of productIds) {
                try {
                    await client.query(
                        'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)',
                        [productId, categoryId]
                    );
                    addedCount++;
                } catch (err) {
                    // Eğer zaten ekliyse skip et
                    if (err.code !== '23505') {
                        throw err;
                    }
                }
            }
            
            await client.query('COMMIT');
            res.json({ message: `${addedCount} ürüne kategori eklendi.`, addedCount });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Toplu kategori atama hatası:', error);
        res.status(500).json({ error: 'Kategoriler atanamadı.' });
    }
});

module.exports = router;
