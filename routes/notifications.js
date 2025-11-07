const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const {
    NOTIFICATION_TYPES,
    createNotification,
    notifyAdmins,
    notifyAllUsers,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteNotification
} = require('../notificationHelper');

// Admin kontrolü
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli' });
    }
    next();
};

router.use((req, res, next) => {
    console.log(`🔔 Notifications rotasına girdi! URL: ${req.url}, User Role: ${req.user?.role}`);
    next();
});

// Kullanıcının bildirimlerini getir
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0, unreadOnly = false } = req.query;
        const userId = req.user.userId;

        let query = `
            SELECT 
                n.*,
                CASE 
                    WHEN n.sender_id IS NOT NULL THEN 
                        json_build_object(
                            'id', u.id,
                            'firstName', u.first_name,
                            'lastName', u.last_name,
                            'role', u.role
                        )
                    ELSE NULL
                END as sender
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            WHERE n.user_id = $1
        `;

        const params = [userId];
        
        if (unreadOnly === 'true') {
            query += ' AND n.is_read = FALSE';
        }

        query += ' ORDER BY n.created_at DESC LIMIT $2 OFFSET $3';
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        
        // Toplam sayı
        const countQuery = unreadOnly === 'true' 
            ? 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE'
            : 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
        const countResult = await pool.query(countQuery, [userId]);
        
        res.json({
            notifications: result.rows,
            total: parseInt(countResult.rows[0].count),
            unreadCount: await getUnreadCount(userId)
        });
    } catch (error) {
        console.error('Bildirimler getirme hatası:', error);
        res.status(500).json({ error: 'Bildirimler yüklenemedi' });
    }
});

// Okunmamış bildirim sayısını getir
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const count = await getUnreadCount(req.user.userId);
        res.json({ count });
    } catch (error) {
        console.error('Okunmamış sayı hatası:', error);
        res.status(500).json({ error: 'Sayı alınamadı' });
    }
});

// Bildirimi okundu olarak işaretle
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.userId;

        const notification = await markAsRead(notificationId, userId);
        
        if (!notification) {
            return res.status(404).json({ error: 'Bildirim bulunamadı' });
        }

        res.json(notification);
    } catch (error) {
        console.error('Bildirim okundu işaretleme hatası:', error);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

// Tüm bildirimleri okundu olarak işaretle
router.put('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notifications = await markAllAsRead(userId);
        
        res.json({ 
            message: 'Tüm bildirimler okundu olarak işaretlendi',
            count: notifications.length
        });
    } catch (error) {
        console.error('Toplu okundu işaretleme hatası:', error);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

// Bildirimi sil
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.userId;

        const notification = await deleteNotification(notificationId, userId);
        
        if (!notification) {
            return res.status(404).json({ error: 'Bildirim bulunamadı' });
        }

        res.json({ message: 'Bildirim silindi' });
    } catch (error) {
        console.error('Bildirim silme hatası:', error);
        res.status(500).json({ error: 'Silme başarısız' });
    }
});

// Admin: Genel duyuru gönder (tüm kullanıcılara)
router.post('/announce', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { title, message, link } = req.body;
        const senderId = req.user.userId;

        if (!title || !message) {
            return res.status(400).json({ error: 'Başlık ve mesaj gerekli' });
        }

        const notifications = await notifyAllUsers({
            title,
            message,
            link: link || null,
            senderId
        });

        res.json({ 
            message: 'Duyuru gönderildi',
            count: notifications.length
        });
    } catch (error) {
        console.error('Duyuru gönderme hatası:', error);
        res.status(500).json({ error: 'Duyuru gönderilemedi' });
    }
});

// Kullanıcının bildirim tercihlerini getir
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const query = 'SELECT * FROM notification_preferences WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        
        if (result.rows.length === 0) {
            // Yoksa oluştur
            const createQuery = `
                INSERT INTO notification_preferences (user_id)
                VALUES ($1)
                RETURNING *
            `;
            const createResult = await pool.query(createQuery, [userId]);
            return res.json(createResult.rows[0]);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Tercih getirme hatası:', error);
        res.status(500).json({ error: 'Tercihler yüklenemedi' });
    }
});

// Kullanıcının bildirim tercihlerini güncelle
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            order_status_updates,
            campaign_notifications,
            question_answers,
            general_announcements,
            new_orders,
            new_questions,
            low_stock_alerts,
            email_order_status,
            email_campaigns,
            email_announcements
        } = req.body;

        const query = `
            UPDATE notification_preferences
            SET 
                order_status_updates = COALESCE($2, order_status_updates),
                campaign_notifications = COALESCE($3, campaign_notifications),
                question_answers = COALESCE($4, question_answers),
                general_announcements = COALESCE($5, general_announcements),
                new_orders = COALESCE($6, new_orders),
                new_questions = COALESCE($7, new_questions),
                low_stock_alerts = COALESCE($8, low_stock_alerts),
                email_order_status = COALESCE($9, email_order_status),
                email_campaigns = COALESCE($10, email_campaigns),
                email_announcements = COALESCE($11, email_announcements),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
            RETURNING *
        `;

        const values = [
            userId,
            order_status_updates,
            campaign_notifications,
            question_answers,
            general_announcements,
            new_orders,
            new_questions,
            low_stock_alerts,
            email_order_status,
            email_campaigns,
            email_announcements
        ];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tercih ayarları bulunamadı' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Tercih güncelleme hatası:', error);
        res.status(500).json({ error: 'Tercihler güncellenemedi' });
    }
});

module.exports = router;
