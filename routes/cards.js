const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// KULLANICININ KAYITLI KARTLARINI GETİR (GET /api/cards)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const cardsResult = await pool.query(
            'SELECT id, card_holder_name, last_four_digits, card_type, expiry_month, expiry_year FROM user_cards WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(cardsResult.rows);
    } catch (err) {
        console.error('Kullanıcı kartları getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// YENİ KART EKLE (POST /api/cards)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { card_holder_name, last_four_digits, card_type, expiry_month, expiry_year } = req.body;
        const userId = req.user.userId;

        if (!card_holder_name || !last_four_digits || !expiry_month || !expiry_year) {
            return res.status(400).json({ error: 'Tüm kart bilgileri zorunludur.' });
        }

        // Basic validation for last_four_digits (should be 4 digits)
        if (!/^\d{4}$/.test(last_four_digits)) {
            return res.status(400).json({ error: 'Kart numarasının son 4 hanesi geçersiz.' });
        }
        // Basic validation for expiry month/year
        if (expiry_month < 1 || expiry_month > 12 || expiry_year < 0 || expiry_year > 99) {
            return res.status(400).json({ error: 'Son kullanma tarihi geçersiz.' });
        }

        const newCard = await pool.query(
            'INSERT INTO user_cards (user_id, card_holder_name, last_four_digits, card_type, expiry_month, expiry_year) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, card_holder_name, last_four_digits, card_type, expiry_month, expiry_year',
            [userId, card_holder_name, last_four_digits, card_type, expiry_month, expiry_year]
        );

        res.status(201).json(newCard.rows[0]);
    } catch (err) {
        console.error('Yeni kart eklenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// KART SİL (DELETE /api/cards/:id)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const cardId = req.params.id;
        const userId = req.user.userId;

        const deleteResult = await pool.query(
            'DELETE FROM user_cards WHERE id = $1 AND user_id = $2 RETURNING id',
            [cardId, userId]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kart bulunamadı veya bu kartı silme yetkiniz yok.' });
        }

        res.status(200).json({ message: 'Kart başarıyla silindi.' });
    } catch (err) {
        console.error('Kart silinirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

module.exports = router;