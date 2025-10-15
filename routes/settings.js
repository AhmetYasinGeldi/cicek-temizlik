const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeAdmin = require('../middleware/authorizeAdmin');

router.get('/', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings');
        const settingsObject = result.rows.reduce((obj, item) => {
            obj[item.setting_key] = item.setting_value;
            return obj;
        }, {});
        res.json(settingsObject);
    } catch (err) {
        console.error('Ayarlar getirilirken hata:', err);
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

router.put('/', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const settings = req.body;
        
        for (const key in settings) {
            if (Object.hasOwnProperty.call(settings, key)) {
                const value = settings[key];
                await pool.query(
                    'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
                    [key, value]
                );
            }
        }
        res.status(200).json({ message: 'Ayarlar başarıyla güncellendi.' });
    } catch (err) {
        console.error('Ayarlar güncellenirken hata:', err);
        res.status(500).json({ error: "Sunucuda bir hata oluştu." });
    }
});

module.exports = router;