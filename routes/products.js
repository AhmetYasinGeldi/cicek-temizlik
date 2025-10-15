const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const getOptionalUser = require('../middleware/getOptionalUser');
const { getSettings } = require('../settingsHelper');

// TÜM ÜRÜNLERİ GETİR (Ayarlara ve role göre)
router.get('/', getOptionalUser, async (req, res) => {
    try {
        const settings = await getSettings();
        let query;

        if (req.user && req.user.role === 'admin') {
            query = 'SELECT * FROM products ORDER BY id';
        } else {
            if (settings.out_of_stock_behavior === 'show_as_out_of_stock') {
                query = 'SELECT * FROM products WHERE is_active = true ORDER BY id';
            } else {
                query = 'SELECT * FROM products WHERE is_active = true AND stock_quantity > 0 ORDER BY id';
            }
        }
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Ürünler listelenirken hata:', err);
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

// TEK BİR ÜRÜNÜ GETİR (Admin ise hepsini, değilse sadece aktif olanları gösterir)
router.get('/:id', getOptionalUser, async (req, res) => {
    try {
        const { id } = req.params;
        let query = 'SELECT * FROM products WHERE id = $1';
        
        if (!req.user || req.user.role !== 'admin') {
            query = 'SELECT * FROM products WHERE id = $1 AND is_active = true';
        }

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bu ID ile bir ürün bulunamadı veya görme yetkiniz yok.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`Ürün ${req.params.id} detayları alınırken hata:`, err);
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

// YENİ ÜRÜN EKLE (Admin)
router.post('/', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const { name, price, description, image_url, stock_quantity, is_active } = req.body;
      
        if (!name || price == null) {
            return res.status(400).json({ error: 'İsim ve fiyat alanları zorunludur.' });
        }
        if (price <= 0) {
            return res.status(400).json({ error: 'Fiyat 0\'dan büyük olmalıdır.' });
        }
        if (stock_quantity < 0) {
            return res.status(400).json({ error: 'Stok miktarı 0\'dan küçük olamaz.' });
        }

        const newProduct = await pool.query(
            'INSERT INTO products (name, price, description, image_url, stock_quantity, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, price, description, image_url, stock_quantity || 0, is_active != null ? is_active : true]
        );
      
        res.status(201).json(newProduct.rows[0]);
    
    } catch (err) {
        console.error('Ürün eklenirken hata:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Bu isimde bir ürün zaten mevcut.' });
        }
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

// ÜRÜN GÜNCELLE (Admin)
router.put('/:id', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, image_url, stock_quantity, is_active } = req.body;
        if (!name || price == null) {
            return res.status(400).json({ error: 'İsim ve fiyat alanları zorunludur.' });
        }
        const updatedProduct = await pool.query(
            'UPDATE products SET name = $1, price = $2, description = $3, image_url = $4, stock_quantity = $5, is_active = $6 WHERE id = $7 RETURNING *',
            [name, price, description, image_url, stock_quantity, is_active, id]
        );
        if (updatedProduct.rows.length === 0) {
            return res.status(404).json({ error: 'Bu ID ile bir ürün bulunamadı, güncellenemedi.' });
        }
        res.status(200).json(updatedProduct.rows[0]);
    } catch (err) {
        console.error(`Ürün ${req.params.id} güncellenirken hata:`, err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Bu isimde bir ürün zaten mevcut.' });
        }
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

// ÜRÜN SİL (Admin)
router.delete('/:id', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bu ID ile bir ürün bulunamadı, silinemedi.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(`Ürün ${req.params.id} silinirken hata:`, err);
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

module.exports = router;