const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authenticateToken');
const { notifyWelcome } = require('../notificationHelper');
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

        const user = newUser.rows[0];
        
        // Hoşgeldin bildirimi gönder
        try {
            await notifyWelcome(user.id, user.first_name);
        } catch (notifError) {
            console.error('Hoşgeldin bildirimi gönderme hatası:', notifError);
        }

        res.status(201).json(user);
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
    const client = await pool.connect();
    try {
        const userId = req.user.userId;
        
        console.log('========================================');
        console.log('Kullanıcı silme işlemi başlatıldı. User ID:', userId);
        console.log('User ID tipi:', typeof userId);
        console.log('========================================');
        
        // Önce veritabanı yapısını kontrol et (transaction dışında)
        console.log('Veritabanı yapısı kontrol ediliyor...');
        
        const tablesQuery = `
            SELECT 
                t.table_name,
                c.column_name,
                c.data_type
            FROM information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND (c.column_name LIKE '%user%' OR c.column_name LIKE '%customer%')
            ORDER BY t.table_name, c.column_name;
        `;
        
        const tablesResult = await client.query(tablesQuery);
        console.log('Kullanıcı ile ilgili sütunlar:');
        tablesResult.rows.forEach(row => {
            console.log(`  - ${row.table_name}.${row.column_name} (${row.data_type})`);
        });
        console.log('========================================');
        
        // Şimdi transaction başlat
        await client.query('BEGIN');

        // Silme işlemlerini yap - hata olursa transaction abort olacağı için
        // tüm işlemleri tek seferde başarılı olmak zorunda
        console.log('Silme işlemleri başlatılıyor...');
        
        try {
            // 1. Sepet (carts)
            console.log('1. carts siliniyor...');
            const cartsResult = await client.query('DELETE FROM carts WHERE user_id = $1', [userId]);
            console.log(`   ✓ ${cartsResult.rowCount} kayıt silindi`);
            
            // 2. Sipariş detayları (order_items) - önce bunları sil
            console.log('2. order_items siliniyor...');
            const orderItemsResult = await client.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [userId]);
            console.log(`   ✓ ${orderItemsResult.rowCount} kayıt silindi`);
            
            // 3. Siparişler (orders)
            console.log('3. orders siliniyor...');
            const ordersResult = await client.query('DELETE FROM orders WHERE user_id = $1', [userId]);
            console.log(`   ✓ ${ordersResult.rowCount} kayıt silindi`);
            
            // 4. Adresler (user_addresses)
            console.log('4. user_addresses siliniyor...');
            const addressesResult = await client.query('DELETE FROM user_addresses WHERE user_id = $1', [userId]);
            console.log(`   ✓ ${addressesResult.rowCount} kayıt silindi`);
            
            // 5. Kartlar (user_cards)
            console.log('5. user_cards siliniyor...');
            const cardsResult = await client.query('DELETE FROM user_cards WHERE user_id = $1', [userId]);
            console.log(`   ✓ ${cardsResult.rowCount} kayıt silindi`);
            
            // 6. FAQ - user_id NULL yap (tabloyu kontrol et)
            console.log('6. faq kontrol ediliyor...');
            // Önce tablo var mı kontrol et
            const faqTableCheck = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'faq'
                );
            `);
            
            if (faqTableCheck.rows[0].exists) {
                const faqResult = await client.query('UPDATE faq SET user_id = NULL WHERE user_id = $1', [userId]);
                console.log(`   ✓ ${faqResult.rowCount} FAQ kaydı güncellendi`);
            } else {
                console.log(`   ℹ FAQ tablosu yok, atlandı`);
            }
            
            // 7. Diğer olası tablolar - bunlar yoksa sessizce devam et
            console.log('7. Diğer tablolar kontrol ediliyor...');
            const optionalTables = ['reviews', 'wishlist', 'notifications', 'user_sessions', 'favorites'];
            for (const table of optionalTables) {
                try {
                    const checkTable = await client.query(`
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = $1
                        );
                    `, [table]);
                    
                    if (checkTable.rows[0].exists) {
                        const result = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
                        if (result.rowCount > 0) {
                            console.log(`   ✓ ${table}: ${result.rowCount} kayıt silindi`);
                        }
                    }
                } catch (err) {
                    // Bu tablodan silme başarısız, devam et
                    console.log(`   ⚠ ${table} atlandı:`, err.message);
                }
            }
            
            // 8. KULLANICIYI SİL - Bu MUTLAKA başarılı olmalı
            console.log('8. Kullanıcı siliniyor...');
            const userDeleteResult = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
            
            if (userDeleteResult.rowCount === 0) {
                throw new Error('Kullanıcı bulunamadı');
            }
            
            console.log(`   ✓ Kullanıcı silindi!`);
            
            // Transaction'ı commit et
            await client.query('COMMIT');
            console.log('========================================');
            console.log('✓✓✓ BAŞARILI: Kullanıcı tamamen silindi! ✓✓✓');
            console.log('========================================');

            res.status(200).json({ message: 'Hesabınız başarıyla silindi.' });
            
        } catch (deleteErr) {
            // Transaction içinde bir hata oldu - rollback yap
            await client.query('ROLLBACK');
            throw deleteErr; // Ana catch bloğuna gönder
        }

    } catch (err) {
        // Transaction'ı geri al (eğer hala açıksa)
        try {
            await client.query('ROLLBACK');
            console.log('Transaction rollback yapıldı');
        } catch (rollbackErr) {
            console.error('Rollback hatası:', rollbackErr.message);
        }
        
        console.error('========================================');
        console.error('✗✗✗ HATA: Kullanıcı silinemedi ✗✗✗');
        console.error('========================================');
        console.error('Hata mesajı:', err.message);
        console.error('Hata kodu:', err.code);
        console.error('Hata detayı:', err.detail);
        console.error('Hata constraint:', err.constraint);
        console.error('Hata table:', err.table);
        console.error('Hata column:', err.column);
        console.error('Stack:', err.stack);
        console.error('========================================');
        
        res.status(500).json({ 
            error: 'Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin.',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        client.release();
    }
});

module.exports = router;