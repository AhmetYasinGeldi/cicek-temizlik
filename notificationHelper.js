const pool = require('./db');

// Bildirim tipleri
const NOTIFICATION_TYPES = {
    ORDER_STATUS: 'order_status',
    NEW_ORDER: 'new_order',
    CAMPAIGN: 'campaign',
    QUESTION_ANSWER: 'question_answer',
    NEW_QUESTION: 'new_question',
    GENERAL_ANNOUNCEMENT: 'general_announcement',
    LOW_STOCK: 'low_stock',
    WELCOME: 'welcome'
};

/**
 * Yeni bildirim oluştur
 */
async function createNotification({ userId, type, title, message, link = null, orderId = null, questionId = null, campaignCode = null, isGlobal = false, senderId = null }) {
    try {
        // Eğer global bildirim değilse, kullanıcının tercihlerini kontrol et
        if (!isGlobal && userId) {
            const prefAllowed = await checkUserPreference(userId, type);
            if (!prefAllowed) {
                console.log(`Bildirim gönderilmedi: Kullanıcı ${userId} bu tip bildirimi devre dışı bırakmış.`);
                return null;
            }
        }

        const query = `
            INSERT INTO notifications (user_id, type, title, message, link, order_id, question_id, campaign_code, is_global, sender_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const values = [userId, type, title, message, link, orderId, questionId, campaignCode, isGlobal, senderId];
        const result = await pool.query(query, values);
        
        console.log(`✉️ Bildirim oluşturuldu: ${title} (Type: ${type})`);
        return result.rows[0];
    } catch (error) {
        console.error('Bildirim oluşturma hatası:', error);
        throw error;
    }
}

/**
 * Kullanıcının bildirim tercihini kontrol et
 */
async function checkUserPreference(userId, type) {
    try {
        const query = 'SELECT * FROM notification_preferences WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        
        if (result.rows.length === 0) {
            // Tercih yoksa, varsayılan olarak true döndür
            return true;
        }

        const prefs = result.rows[0];
        
        // Bildirim tipine göre tercihi kontrol et
        switch (type) {
            case NOTIFICATION_TYPES.ORDER_STATUS:
                return prefs.order_status_updates;
            case NOTIFICATION_TYPES.CAMPAIGN:
                return prefs.campaign_notifications;
            case NOTIFICATION_TYPES.QUESTION_ANSWER:
                return prefs.question_answers;
            case NOTIFICATION_TYPES.GENERAL_ANNOUNCEMENT:
                return prefs.general_announcements;
            case NOTIFICATION_TYPES.NEW_ORDER:
                return prefs.new_orders;
            case NOTIFICATION_TYPES.NEW_QUESTION:
                return prefs.new_questions;
            case NOTIFICATION_TYPES.LOW_STOCK:
                return prefs.low_stock_alerts;
            default:
                return true;
        }
    } catch (error) {
        console.error('Tercih kontrolü hatası:', error);
        return true; // Hata durumunda bildirimi gönder
    }
}

/**
 * Tüm adminlere bildirim gönder
 */
async function notifyAdmins({ type, title, message, link = null, orderId = null, questionId = null, senderId = null }) {
    try {
        const adminQuery = "SELECT id FROM users WHERE role = 'admin'";
        const admins = await pool.query(adminQuery);
        
        const notifications = [];
        for (const admin of admins.rows) {
            const notification = await createNotification({
                userId: admin.id,
                type,
                title,
                message,
                link,
                orderId,
                questionId,
                senderId
            });
            if (notification) notifications.push(notification);
        }
        
        return notifications;
    } catch (error) {
        console.error('Admin bildirim hatası:', error);
        throw error;
    }
}

/**
 * Tüm kullanıcılara genel duyuru gönder
 */
async function notifyAllUsers({ title, message, link = null, senderId = null, excludeUserId = null }) {
    try {
        let userQuery = "SELECT id FROM users WHERE role = 'customer'";
        const params = [];
        
        if (excludeUserId) {
            userQuery += " AND id != $1";
            params.push(excludeUserId);
        }
        
        const users = await pool.query(userQuery, params);
        
        const notifications = [];
        for (const user of users.rows) {
            const notification = await createNotification({
                userId: user.id,
                type: NOTIFICATION_TYPES.GENERAL_ANNOUNCEMENT,
                title,
                message,
                link,
                isGlobal: true,
                senderId
            });
            if (notification) notifications.push(notification);
        }
        
        return notifications;
    } catch (error) {
        console.error('Toplu bildirim hatası:', error);
        throw error;
    }
}

/**
 * Sipariş durumu güncelleme bildirimi
 */
async function notifyOrderStatusChange(orderId, newStatus, userId) {
    const statusMessages = {
        'pending': 'Siparişiniz alındı ve işleme alınıyor.',
        'payment_waiting': 'Siparişiniz ödeme bekliyor.',
        'payment_failed': 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.',
        'confirmed': 'Siparişiniz onaylandı!',
        'preparing': 'Siparişiniz hazırlanıyor.',
        'shipped': 'Siparişiniz kargoya verildi!',
        'delivered': 'Siparişiniz teslim edildi. Afiyet olsun! 🎉',
        'cancelled': 'Siparişiniz iptal edildi.'
    };

    const title = `Sipariş #${orderId} - Durum Güncellendi`;
    const message = statusMessages[newStatus] || 'Sipariş durumunuz güncellendi.';
    
    return await createNotification({
        userId,
        type: NOTIFICATION_TYPES.ORDER_STATUS,
        title,
        message,
        link: `/order-detail.html?id=${orderId}`,
        orderId
    });
}

/**
 * Yeni sipariş bildirimi (adminlere)
 */
async function notifyNewOrder(orderId, customerName, totalAmount) {
    const title = '🛒 Yeni Sipariş Alındı!';
    const message = `${customerName} adlı müşteri ${totalAmount} TL tutarında sipariş verdi.`;
    
    return await notifyAdmins({
        type: NOTIFICATION_TYPES.NEW_ORDER,
        title,
        message,
        link: `/orders.html?orderId=${orderId}`,
        orderId
    });
}

/**
 * Kampanya/İndirim bildirimi
 */
async function notifyCampaign({ title, message, campaignCode = null, link = null, senderId = null }) {
    return await notifyAllUsers({
        title: `🎉 ${title}`,
        message,
        link,
        senderId
    });
}

/**
 * Hoşgeldin bildirimi (yeni kullanıcı)
 */
async function notifyWelcome(userId, firstName) {
    const title = `Hoş Geldiniz ${firstName}! 👋`;
    const message = 'Çiçek Temizlik\'e katıldığınız için teşekkürler! İhtiyacınız olan tüm temizlik ürünlerini burada bulabilirsiniz.';
    
    return await createNotification({
        userId,
        type: NOTIFICATION_TYPES.WELCOME,
        title,
        message,
        link: '/'
    });
}

/**
 * Stok azalma uyarısı (adminlere)
 */
async function notifyLowStock(productId, productName, stockQuantity) {
    const title = '⚠️ Düşük Stok Uyarısı';
    const message = `${productName} ürününün stoğu azaldı. Mevcut stok: ${stockQuantity}`;
    
    return await notifyAdmins({
        type: NOTIFICATION_TYPES.LOW_STOCK,
        title,
        message,
        link: `/product.html?id=${productId}`
    });
}

/**
 * Bildirimi okundu olarak işaretle
 */
async function markAsRead(notificationId, userId) {
    try {
        const query = `
            UPDATE notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [notificationId, userId]);
        return result.rows[0];
    } catch (error) {
        console.error('Bildirim okundu işaretleme hatası:', error);
        throw error;
    }
}

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
async function markAllAsRead(userId) {
    try {
        const query = `
            UPDATE notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
            WHERE user_id = $1 AND is_read = FALSE
            RETURNING *
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('Tüm bildirimler okundu işaretleme hatası:', error);
        throw error;
    }
}

/**
 * Okunmamış bildirim sayısını getir
 */
async function getUnreadCount(userId) {
    try {
        const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE';
        const result = await pool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    } catch (error) {
        console.error('Okunmamış bildirim sayısı hatası:', error);
        return 0;
    }
}

/**
 * Bildirimi sil
 */
async function deleteNotification(notificationId, userId) {
    try {
        const query = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(query, [notificationId, userId]);
        return result.rows[0];
    } catch (error) {
        console.error('Bildirim silme hatası:', error);
        throw error;
    }
}

module.exports = {
    NOTIFICATION_TYPES,
    createNotification,
    checkUserPreference,
    notifyAdmins,
    notifyAllUsers,
    notifyOrderStatusChange,
    notifyNewOrder,
    notifyCampaign,
    notifyWelcome,
    notifyLowStock,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteNotification
};
