const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;

// YENİ KULLANICI KAYDI
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'E-posta ve şifre alanları zorunludur.' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, passwordHash]
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
            role: user.role
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

module.exports = router;