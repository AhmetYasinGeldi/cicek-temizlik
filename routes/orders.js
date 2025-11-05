const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const { notifyNewOrder, notifyOrderStatusChange } = require('../notificationHelper');

// Sadece admin kontrolü
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    next();
};

// Tüm siparişleri getir (Admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                o.*,
                u.first_name, u.last_name, u.email,
                COUNT(*) OVER() as total_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
        `;
        
        const conditions = [];
        const params = [];
        
        if (status) {
            params.push(status);
            conditions.push(`o.order_status = $${params.length}`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
        
        res.json({
            orders: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Siparişler getirilirken hata:', error);
        res.status(500).json({ error: 'Siparişler getirilemedi.' });
    }
});

// Belirli bir siparişin detaylarını getir
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const isAdmin = req.user.role === 'admin';
        
        // Sipariş bilgisi
        const orderQuery = `
            SELECT 
                o.*,
                u.first_name, u.last_name, u.email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = $1
        `;
        const orderResult = await pool.query(orderQuery, [id]);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sipariş bulunamadı.' });
        }
        
        const order = orderResult.rows[0];
        
        // Yetki kontrolü (admin değilse sadece kendi siparişini görebilir)
        if (!isAdmin && order.user_id !== userId) {
            return res.status(403).json({ error: 'Bu siparişi görme yetkiniz yok.' });
        }
        
        // Sipariş ürünleri
        const itemsQuery = `
            SELECT * FROM order_items
            WHERE order_id = $1
            ORDER BY id
        `;
        const itemsResult = await pool.query(itemsQuery, [id]);
        
        // Sipariş geçmişi
        const historyQuery = `
            SELECT 
                oh.*,
                u.first_name, u.last_name
            FROM order_history oh
            LEFT JOIN users u ON oh.created_by = u.id
            WHERE oh.order_id = $1
            ORDER BY oh.created_at DESC
        `;
        const historyResult = await pool.query(historyQuery, [id]);
        
        res.json({
            order,
            items: itemsResult.rows,
            history: historyResult.rows
        });
    } catch (error) {
        console.error('Sipariş detayları getirilirken hata:', error);
        res.status(500).json({ error: 'Sipariş detayları getirilemedi.' });
    }
});

// Yeni sipariş oluştur (Kullanıcı)
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const userId = req.user.userId;
        console.log('User ID from token:', userId, 'Type:', typeof userId);
        
        const {
            address,
            paymentMethod,
            cardInfo,
            items,
            customerNote
        } = req.body;
        
        console.log('Order request body:', { address, paymentMethod, items: items?.length });
        
        if (!address || !items || items.length === 0) {
            throw new Error('Adres ve ürün bilgileri gerekli.');
        }
        
        // Toplam hesapla
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of items) {
            const productResult = await client.query(
                'SELECT * FROM products WHERE id = $1',
                [item.productId]
            );
            
            if (productResult.rows.length === 0) {
                throw new Error(`Ürün bulunamadı: ${item.productId}`);
            }
            
            const product = productResult.rows[0];
            
            if (product.stock_quantity < item.quantity) {
                throw new Error(`${product.name} için yeterli stok yok.`);
            }
            
            const itemSubtotal = parseFloat(product.price) * item.quantity;
            subtotal += itemSubtotal;
            
            orderItems.push({
                productId: product.id,
                productName: product.name,
                productImageUrl: product.image_url,
                unitPrice: product.price,
                quantity: item.quantity,
                subtotal: itemSubtotal
            });
        }
        
        const shippingCost = 0; // Kargo ücreti hesaplama mantığı buraya eklenebilir
        const tax = 0; // KDV hesaplama mantığı buraya eklenebilir
        const discount = 0; // İndirim hesaplama mantığı buraya eklenebilir
        const totalAmount = subtotal + shippingCost + tax - discount;
        
        // Sipariş oluştur
        const orderQuery = `
            INSERT INTO orders (
                user_id, address_title, full_name, phone, address_line, city, district, postal_code,
                payment_method, card_holder_name, card_last4,
                subtotal, tax, shipping_cost, discount, total_amount,
                customer_note, order_status, payment_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;
        
        const orderValues = [
            userId,
            address.title || null,
            address.fullName,
            address.phone,
            address.addressLine,
            address.city,
            address.district,
            address.postalCode || null,
            paymentMethod,
            cardInfo?.cardHolderName || null,
            cardInfo?.last4 || null,
            subtotal,
            tax,
            shippingCost,
            discount,
            totalAmount,
            customerNote || null,
            'pending',
            'pending'
        ];
        
        const orderResult = await client.query(orderQuery, orderValues);
        const order = orderResult.rows[0];
        
        // Sipariş ürünlerini ekle ve stokları güncelle
        for (const item of orderItems) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_name, product_image_url, unit_price, quantity, subtotal)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [order.id, item.productId, item.productName, item.productImageUrl, item.unitPrice, item.quantity, item.subtotal]
            );
            
            // Stok düş
            await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.productId]
            );
        }
        
        // İlk durum kaydı
        await client.query(
            'INSERT INTO order_history (order_id, status, note, created_by) VALUES ($1, $2, $3, $4)',
            [order.id, 'pending', 'Sipariş oluşturuldu', userId]
        );
        
        // Sepeti temizle
        await client.query(
            'DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)',
            [userId]
        );
        
        await client.query('COMMIT');
        
        // Kullanıcı bilgisini al
        const userResult = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        const customerName = `${user.first_name} ${user.last_name}`;
        
        // Adminlere yeni sipariş bildirimi gönder
        try {
            await notifyNewOrder(order.id, customerName, totalAmount);
        } catch (notifError) {
            console.error('Bildirim gönderme hatası:', notifError);
            // Bildirim hatası sipariş oluşturmayı etkilemez
        }
        
        res.status(201).json({ order, message: 'Sipariş başarıyla oluşturuldu!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Sipariş oluşturulurken hata:', error);
        res.status(500).json({ error: error.message || 'Sipariş oluşturulamadı.' });
    } finally {
        client.release();
    }
});

// Sipariş durumunu güncelle (Admin)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { orderStatus, paymentStatus, note } = req.body;
        const adminId = req.user.userId;
        
        const updates = [];
        const params = [id];
        let paramIndex = 2;
        
        if (orderStatus) {
            updates.push(`order_status = $${paramIndex}`);
            params.push(orderStatus);
            paramIndex++;
            
            // Tarih güncellemeleri
            if (orderStatus === 'shipped' && !params.includes('shipped_date')) {
                updates.push(`shipped_date = CURRENT_TIMESTAMP`);
            } else if (orderStatus === 'delivered') {
                updates.push(`delivered_date = CURRENT_TIMESTAMP`);
            }
        }
        
        if (paymentStatus) {
            updates.push(`payment_status = $${paramIndex}`);
            params.push(paymentStatus);
            paramIndex++;
            
            if (paymentStatus === 'paid') {
                updates.push(`payment_date = CURRENT_TIMESTAMP`);
            }
        }
        
        if (updates.length === 0) {
            throw new Error('Güncellenecek alan belirtilmedi.');
        }
        
        const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
        const result = await client.query(query, params);
        
        if (result.rows.length === 0) {
            throw new Error('Sipariş bulunamadı.');
        }
        
        // Geçmiş kaydı ekle
        const statusToLog = orderStatus || paymentStatus;
        await client.query(
            'INSERT INTO order_history (order_id, status, note, created_by) VALUES ($1, $2, $3, $4)',
            [id, statusToLog, note || `Durum güncellendi: ${statusToLog}`, adminId]
        );
        
        await client.query('COMMIT');
        
        const updatedOrder = result.rows[0];
        
        // Kullanıcıya sipariş durumu bildir imi gönder
        if (orderStatus) {
            try {
                await notifyOrderStatusChange(id, orderStatus, updatedOrder.user_id);
            } catch (notifError) {
                console.error('Bildirim gönderme hatası:', notifError);
            }
        }
        
        res.json({ order: updatedOrder, message: 'Sipariş durumu güncellendi.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Sipariş durumu güncellenirken hata:', error);
        res.status(500).json({ error: error.message || 'Sipariş durumu güncellenemedi.' });
    } finally {
        client.release();
    }
});

// Kargo bilgilerini güncelle (Admin)
router.patch('/:id/shipping', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { cargoCompany, trackingNumber, estimatedDeliveryDate } = req.body;
        
        const updates = [];
        const params = [id];
        let paramIndex = 2;
        
        if (cargoCompany) {
            updates.push(`cargo_company = $${paramIndex++}`);
            params.push(cargoCompany);
        }
        
        if (trackingNumber) {
            updates.push(`tracking_number = $${paramIndex++}`);
            params.push(trackingNumber);
        }
        
        if (estimatedDeliveryDate) {
            updates.push(`estimated_delivery_date = $${paramIndex++}`);
            params.push(estimatedDeliveryDate);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Güncellenecek alan belirtilmedi.' });
        }
        
        const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sipariş bulunamadı.' });
        }
        
        res.json({ order: result.rows[0], message: 'Kargo bilgileri güncellendi.' });
    } catch (error) {
        console.error('Kargo bilgileri güncellenirken hata:', error);
        res.status(500).json({ error: 'Kargo bilgileri güncellenemedi.' });
    }
});

// Admin notu ekle/güncelle (Admin)
router.patch('/:id/note', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;
        
        const result = await pool.query(
            'UPDATE orders SET admin_note = $1 WHERE id = $2 RETURNING *',
            [adminNote, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sipariş bulunamadı.' });
        }
        
        res.json({ order: result.rows[0], message: 'Not güncellendi.' });
    } catch (error) {
        console.error('Not güncellenirken hata:', error);
        res.status(500).json({ error: 'Not güncellenemedi.' });
    }
});

// Kullanıcının siparişlerini getir
router.get('/user/my-orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await pool.query(
            `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Kullanıcı siparişleri getirilirken hata:', error);
        res.status(500).json({ error: 'Siparişler getirilemedi.' });
    }
});

// Kullanıcı siparişini iptal et
router.post('/:id/cancel', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const userId = req.user.userId;
        
        // Siparişi kontrol et
        const orderResult = await client.query(
            'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        
        if (orderResult.rows.length === 0) {
            throw new Error('Sipariş bulunamadı.');
        }
        
        const order = orderResult.rows[0];
        
        // İptal edilebilir mi kontrol et
        if (['shipped', 'delivered', 'cancelled'].includes(order.order_status)) {
            throw new Error('Bu sipariş iptal edilemez.');
        }
        
        // Stokları geri ekle
        const itemsResult = await client.query(
            'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
            [id]
        );
        
        for (const item of itemsResult.rows) {
            if (item.product_id) {
                await client.query(
                    'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }
        }
        
        // Siparişi iptal et
        await client.query(
            'UPDATE orders SET order_status = $1 WHERE id = $2',
            ['cancelled', id]
        );
        
        // Geçmiş kaydı ekle
        await client.query(
            'INSERT INTO order_history (order_id, status, note, created_by) VALUES ($1, $2, $3, $4)',
            [id, 'cancelled', 'Kullanıcı tarafından iptal edildi', userId]
        );
        
        await client.query('COMMIT');
        
        res.json({ message: 'Sipariş başarıyla iptal edildi.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Sipariş iptal edilirken hata:', error);
        res.status(500).json({ error: error.message || 'Sipariş iptal edilemedi.' });
    } finally {
        client.release();
    }
});

module.exports = router;
