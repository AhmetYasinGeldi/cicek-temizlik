const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authenticateToken');
const SECRET_KEY = process.env.JWT_SECRET;

// YENİ KULLANICI KAYDI
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'Ad, Soyad, E-posta ve Şifre alanları zorunludur.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, first_name, last_name, email, created_at',
            [firstName, lastName, email, passwordHash]
        );

        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error('Kullanıcı kaydı sırasında hata:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
        }
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

// KULLANICI GİRİŞİ
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'E-posta ve şifre alanları zorunludur.' });
        }
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'E-posta ya da şifre hatalı.' });
        }
        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'E-posta ya da şifre hatalı.' });
        }
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
        };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ 
            message: 'Giriş başarılı!',
            token: token
        });
    } catch (err) {
        console.error('Kullanıcı girişi sırasında hata:', err);
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

// KULLANICI BİLGİLERİNİ GETİR (GET /api/users/me)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = $1', [req.user.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        res.json(userResult.rows[0]);
    } catch (err) {
        console.error('Kullanıcı bilgileri getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// KULLANICI BİLGİLERİNİ GÜNCELLE (PUT /api/users/me)
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        let updateFields = [];
        let queryParams = [];
        let paramIndex = 1;

        updateFields.push(`first_name = $${paramIndex++}`);
        queryParams.push(firstName);

        updateFields.push(`last_name = $${paramIndex++}`);
        queryParams.push(lastName);

        if (currentPassword && newPassword) {
            const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
            const user = userResult.rows[0];

            const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Mevcut şifre yanlış.' });
            }

            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);
            updateFields.push(`password_hash = $${paramIndex++}`);
            queryParams.push(newPasswordHash);
        }

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, first_name, last_name, email, role, created_at`;
        queryParams.push(userId); // Add userId as the last parameter

        const updatedUser = await pool.query(updateQuery, queryParams);

        res.json(updatedUser.rows[0]);
    } catch (err) {
        console.error('Kullanıcı bilgileri güncellenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// KULLANICI HESABINI SİL (DELETE /api/users/me)
router.delete('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Sepetindeki ürünleri sil
        await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
        // Kullanıcıyı sil
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.status(200).json({ message: 'Hesabınız başarıyla silindi.' });
    } catch (err) {
        console.error('Kullanıcı hesabı silinirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

module.exports = router;