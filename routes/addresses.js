const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// KULLANICININ KAYITLI ADRESLERİNİ GETİR (GET /api/addresses)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const addressesResult = await pool.query(
            'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
            [userId]
        );
        res.json(addressesResult.rows);
    } catch (err) {
        console.error('Kullanıcı adresleri getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// TEK BİR ADRESİ GETİR (GET /api/addresses/:id)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.userId;

        const addressResult = await pool.query(
            'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2',
            [addressId, userId]
        );

        if (addressResult.rows.length === 0) {
            return res.status(404).json({ error: 'Adres bulunamadı.' });
        }

        res.json(addressResult.rows[0]);
    } catch (err) {
        console.error('Adres getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// YENİ ADRES EKLE (POST /api/addresses)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            address_title, 
            full_name, 
            phone, 
            city, 
            district, 
            neighborhood, 
            address_line, 
            postal_code,
            is_default 
        } = req.body;
        const userId = req.user.userId;

        if (!address_title || !full_name || !phone || !city || !district || !address_line) {
            return res.status(400).json({ error: 'Zorunlu alanlar eksik.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Eğer bu adres default yapılacaksa, diğerlerini false yap
            if (is_default) {
                await client.query(
                    'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
                    [userId]
                );
            }

            // Eğer kullanıcının hiç adresi yoksa, bu ilk adres otomatik default olsun
            const countResult = await client.query(
                'SELECT COUNT(*) as count FROM user_addresses WHERE user_id = $1',
                [userId]
            );
            const isFirstAddress = parseInt(countResult.rows[0].count) === 0;

            const newAddress = await client.query(
                `INSERT INTO user_addresses 
                (user_id, address_title, full_name, phone, city, district, neighborhood, address_line, postal_code, is_default) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                RETURNING *`,
                [userId, address_title, full_name, phone, city, district, neighborhood || null, address_line, postal_code || null, is_default || isFirstAddress]
            );

            await client.query('COMMIT');
            res.status(201).json(newAddress.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Yeni adres eklenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// ADRESİ GÜNCELLE (PUT /api/addresses/:id)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.userId;
        const { 
            address_title, 
            full_name, 
            phone, 
            city, 
            district, 
            neighborhood, 
            address_line, 
            postal_code,
            is_default 
        } = req.body;

        if (!address_title || !full_name || !phone || !city || !district || !address_line) {
            return res.status(400).json({ error: 'Zorunlu alanlar eksik.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Adresin kullanıcıya ait olduğunu kontrol et
            const checkResult = await client.query(
                'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
                [addressId, userId]
            );

            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Adres bulunamadı veya bu adresi güncelleme yetkiniz yok.' });
            }

            // Eğer bu adres default yapılacaksa, diğerlerini false yap
            if (is_default) {
                await client.query(
                    'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND id != $2',
                    [userId, addressId]
                );
            }

            const updatedAddress = await client.query(
                `UPDATE user_addresses 
                SET address_title = $1, full_name = $2, phone = $3, city = $4, district = $5, 
                    neighborhood = $6, address_line = $7, postal_code = $8, is_default = $9, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $10 AND user_id = $11
                RETURNING *`,
                [address_title, full_name, phone, city, district, neighborhood || null, address_line, postal_code || null, is_default || false, addressId, userId]
            );

            await client.query('COMMIT');
            res.json(updatedAddress.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Adres güncellenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// ADRESİ SİL (DELETE /api/addresses/:id)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.userId;

        const deleteResult = await pool.query(
            'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id, is_default',
            [addressId, userId]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Adres bulunamadı veya bu adresi silme yetkiniz yok.' });
        }

        // Eğer default adres silindiyse ve başka adresler varsa, ilk adresi default yap
        if (deleteResult.rows[0].is_default) {
            await pool.query(
                `UPDATE user_addresses 
                SET is_default = true 
                WHERE user_id = $1 
                AND id = (SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at LIMIT 1)`,
                [userId]
            );
        }

        res.status(200).json({ message: 'Adres başarıyla silindi.' });
    } catch (err) {
        console.error('Adres silinirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// DEFAULT ADRESİ AYARLA (POST /api/addresses/:id/set-default)
router.post('/:id/set-default', authenticateToken, async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.userId;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Adresin kullanıcıya ait olduğunu kontrol et
            const checkResult = await client.query(
                'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
                [addressId, userId]
            );

            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Adres bulunamadı.' });
            }

            // Tüm adresleri false yap
            await client.query(
                'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
                [userId]
            );

            // Seçili adresi default yap
            await client.query(
                'UPDATE user_addresses SET is_default = true WHERE id = $1 AND user_id = $2',
                [addressId, userId]
            );

            await client.query('COMMIT');
            res.json({ message: 'Varsayılan adres güncellendi.' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Default adres ayarlanırken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

module.exports = router;
