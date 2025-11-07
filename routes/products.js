const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const getOptionalUser = require('../middleware/getOptionalUser');
const { getSettings } = require('../settingsHelper');

// Uploads klasörünü oluştur (yoksa)
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// TÜM ÜRÜNLERİ GETİR (Ayarlara ve role göre)
router.get('/', getOptionalUser, async (req, res) => {
    try {
        const settings = await getSettings();
        let query;
        let params = [];

        if (req.user && req.user.role === 'admin') {
            query = 'SELECT * FROM products ORDER BY id';
        } else {
            query = `
                SELECT * FROM products
                WHERE is_active = true AND (
                    stock_quantity > 0 OR
                    out_of_stock_display_rule = 'show' OR
                    (out_of_stock_display_rule = 'default' AND $1 = 'show_as_out_of_stock')
                )
                ORDER BY id;
            `;
            params = [settings.out_of_stock_behavior];
        }
        
        const result = await pool.query(query, params);
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
router.post('/', [authenticateToken, authorizeAdmin, upload.single('productImage')], async (req, res) => {
    try {
        const { name, price, description, stock_quantity, is_active, critical_stock_threshold } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null; // Dosya yüklendiyse URL'i al, yoksa null

        if (!name || price == null) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'İsim ve fiyat alanları zorunludur.' });
        }
        if (price <= 0) {
             if (req.file) fs.unlinkSync(req.file.path);
             return res.status(400).json({ error: 'Fiyat 0\'dan büyük olmalıdır.' });
        }
         if (stock_quantity < 0) {
             if (req.file) fs.unlinkSync(req.file.path);
             return res.status(400).json({ error: 'Stok miktarı 0\'dan küçük olamaz.' });
         }

        const newProduct = await pool.query(
            `INSERT INTO products (name, price, description, image_url, stock_quantity, is_active, critical_stock_threshold)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, price, description, imageUrl, stock_quantity || 0, is_active != null ? (is_active === 'true' || is_active === true) : true, critical_stock_threshold || null]
        );

        res.status(201).json(newProduct.rows[0]);

    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);

        console.error('Ürün eklenirken hata:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Bu isimde bir ürün zaten mevcut.' });
        }
        if (err.message === 'Sadece resim dosyaları yüklenebilir!') {
             return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

// ÜRÜN GÜNCELLE (Admin)
router.put('/:id', [authenticateToken, authorizeAdmin, upload.single('productImage')], async (req, res) => {
    let newImagePath = null;
    try {
        const { id } = req.params;
        const { name, price, description, stock_quantity, is_active, out_of_stock_display_rule, critical_stock_threshold, removeCurrentImage } = req.body;
        newImagePath = req.file ? req.file.path : null;

        if (!name || price == null) {
            if (newImagePath) fs.unlinkSync(newImagePath);
            return res.status(400).json({ error: 'İsim ve fiyat alanları zorunludur.' });
        }

        const currentProductResult = await pool.query('SELECT image_url FROM products WHERE id = $1', [id]);
        if (currentProductResult.rows.length === 0) {
             if (newImagePath) fs.unlinkSync(newImagePath);
             return res.status(404).json({ error: 'Güncellenecek ürün bulunamadı.' });
        }
        const oldImageUrl = currentProductResult.rows[0].image_url;

        let finalImageUrl = oldImageUrl;

        if ((newImagePath || removeCurrentImage === 'true') && oldImageUrl) {
            try {
                const oldImageFullPath = path.join(__dirname, '..', oldImageUrl); // routes klasöründen bir üste çıkıp /uploads/... yolunu bulur
                if (fs.existsSync(oldImageFullPath)) {
                     fs.unlinkSync(oldImageFullPath);
                     console.log("Eski resim silindi:", oldImageFullPath);
                }
            } catch (unlinkErr) {
                console.error("Eski resim silinirken hata:", unlinkErr);
            }
        }

        if (newImagePath) {
            finalImageUrl = `/uploads/${req.file.filename}`;
        } else if (removeCurrentImage === 'true') {
            finalImageUrl = null;
        }

        const updatedProduct = await pool.query(
            `UPDATE products
             SET name = $1, price = $2, description = $3, image_url = $4, stock_quantity = $5,
                 is_active = $6, out_of_stock_display_rule = $7, critical_stock_threshold = $8
             WHERE id = $9
             RETURNING *`,
            [
                name, price, description, finalImageUrl, stock_quantity,
                is_active === 'true' || is_active === true,
                out_of_stock_display_rule || 'default', critical_stock_threshold || null, id
            ]
        );

        if (updatedProduct.rows.length === 0) {
            if (newImagePath) fs.unlinkSync(newImagePath);
            return res.status(404).json({ error: 'Bu ID ile bir ürün bulunamadı, güncellenemedi.' });
        }

        res.status(200).json(updatedProduct.rows[0]);

    } catch (err) {
        if (newImagePath && fs.existsSync(newImagePath)) {
             try { fs.unlinkSync(newImagePath); } catch (e) { console.error("Hata sonrası yeni resim silinemedi:", e); }
        }

        console.error(`Ürün ${req.params.id} güncellenirken hata:`, err);
         if (err.code === '23505') { return res.status(409).json({ error: 'Bu isimde bir ürün zaten mevcut.' }); }
         if (err.message === 'Sadece resim dosyaları yüklenebilir!') { return res.status(400).json({ error: err.message }); }
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