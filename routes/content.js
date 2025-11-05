const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const { createNotification, notifyAdmins, NOTIFICATION_TYPES } = require('../notificationHelper');

// === PAGE CONTENT (Hakkımızda & İletişim) ===

// Sayfa içeriğini getir (herkes)
router.get('/page/:pageName', async (req, res) => {
    try {
        const { pageName } = req.params;
        const result = await pool.query(
            'SELECT content, updated_at FROM page_content WHERE page_name = $1',
            [pageName]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sayfa bulunamadı.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Sayfa içeriği getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// Sayfa içeriğini güncelle (admin)
router.put('/page/:pageName', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const { pageName } = req.params;
        const { content } = req.body;
        
        await pool.query(
            'UPDATE page_content SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE page_name = $2',
            [content, pageName]
        );
        
        res.json({ message: 'Sayfa içeriği güncellendi.' });
    } catch (err) {
        console.error('Sayfa içeriği güncellenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// === HELP INFO (Telefon & Email) ===

// Yardım bilgilerini getir (herkes)
router.get('/help', async (req, res) => {
    try {
        const result = await pool.query('SELECT phone, email, updated_at FROM help_info LIMIT 1');
        if (result.rows.length === 0) {
            return res.json({ phone: '', email: '' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Yardım bilgileri getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// Yardım bilgilerini güncelle (admin)
router.put('/help', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const { phone, email } = req.body;
        
        const checkResult = await pool.query('SELECT id FROM help_info LIMIT 1');
        
        if (checkResult.rows.length === 0) {
            await pool.query(
                'INSERT INTO help_info (phone, email) VALUES ($1, $2)',
                [phone, email]
            );
        } else {
            await pool.query(
                'UPDATE help_info SET phone = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [phone, email, checkResult.rows[0].id]
            );
        }
        
        res.json({ message: 'Yardım bilgileri güncellendi.' });
    } catch (err) {
        console.error('Yardım bilgileri güncellenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// === FAQ (SSS) ===

// Tüm yayınlanmış SSS'leri getir (herkes)
router.get('/faq', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, question, answer, created_at FROM faq WHERE is_published = true ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('SSS getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// Admin için tüm SSS'leri getir (yayınlanmış + yayınlanmamış)
router.get('/faq/all', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.id, f.question, f.answer, f.is_published, f.is_user_question, 
                    f.created_at, f.user_id, u.first_name, u.last_name, u.email
             FROM faq f
             LEFT JOIN users u ON f.user_id = u.id
             ORDER BY f.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Admin SSS getirilirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// Kullanıcı soru ekle
router.post('/faq/question', authenticateToken, async (req, res) => {
    try {
        const { question } = req.body;
        const userId = req.user.userId;
        
        console.log('📝 Kullanıcı soru ekledi:', { userId, question });
        
        if (!question || question.trim() === '') {
            return res.status(400).json({ error: 'Soru boş olamaz.' });
        }
        
        const result = await pool.query(
            'INSERT INTO faq (question, is_user_question, user_id, is_published) VALUES ($1, true, $2, false) RETURNING id',
            [question.trim(), userId]
        );
        
        const faqId = result.rows[0].id;
        console.log('✅ FAQ oluşturuldu, ID:', faqId);
        
        // Kullanıcı bilgisini al
        const userResult = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        const userName = `${user.first_name} ${user.last_name}`;
        
        console.log('👤 Kullanıcı bilgisi:', userName);
        
        // Adminlere bildirim gönder
        try {
            console.log('📢 Adminlere bildirim gönderiliyor...');
            const notifications = await notifyAdmins({
                type: NOTIFICATION_TYPES.NEW_QUESTION,
                title: '💬 Yeni Soru Soruldu',
                message: `${userName} bir soru sordu: "${question.trim().substring(0, 100)}${question.length > 100 ? '...' : ''}"`,
                link: '/faq.html',
                questionId: faqId
            });
            console.log('✅ Bildirim gönderildi, adet:', notifications ? notifications.length : 0);
        } catch (notifError) {
            console.error('❌ Bildirim gönderme hatası:', notifError);
        }
        
        res.status(201).json({ message: 'Sorunuz iletildi. Yakında cevaplanacaktır.', id: faqId });
    } catch (err) {
        console.error('Kullanıcı sorusu eklenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// Admin soru-cevap ekle
router.post('/faq', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const { question, answer, is_published } = req.body;
        
        if (!question || question.trim() === '') {
            return res.status(400).json({ error: 'Soru boş olamaz.' });
        }
        
        const result = await pool.query(
            'INSERT INTO faq (question, answer, is_published, is_user_question) VALUES ($1, $2, $3, false) RETURNING id',
            [question.trim(), answer || '', is_published || false]
        );
        
        res.status(201).json({ message: 'SSS eklendi.', id: result.rows[0].id });
    } catch (err) {
        console.error('Admin SSS eklenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// SSS güncelle (admin)
router.put('/faq/:id', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer, is_published } = req.body;
        
        console.log('📝 Admin FAQ güncelledi:', { id, answer: answer ? 'var' : 'yok' });
        
        // Önce eski verileri al
        const oldResult = await pool.query('SELECT user_id, answer, question FROM faq WHERE id = $1', [id]);
        const oldFaq = oldResult.rows[0];
        
        console.log('📋 Eski FAQ bilgisi:', { 
            user_id: oldFaq?.user_id, 
            oldAnswer: oldFaq?.answer ? 'vardı' : 'yoktu',
            newAnswer: answer ? 'var' : 'yok'
        });
        
        await pool.query(
            'UPDATE faq SET question = $1, answer = $2, is_published = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
            [question, answer, is_published, id]
        );
        
        // Eğer kullanıcı sorusuysa ve cevap eklendiyse/değiştiyse bildirim gönder
        if (oldFaq && oldFaq.user_id && answer && answer.trim() !== '' && answer !== oldFaq.answer) {
            console.log('📢 Kullanıcıya bildirim gönderiliyor...');
            try {
                const notification = await createNotification({
                    userId: oldFaq.user_id,
                    type: NOTIFICATION_TYPES.QUESTION_ANSWER,
                    title: '✅ Sorunuz Cevaplandı!',
                    message: `Sorunuz: "${oldFaq.question.substring(0, 80)}${oldFaq.question.length > 80 ? '...' : ''}"\n\nCevap: ${answer.substring(0, 150)}${answer.length > 150 ? '...' : ''}`,
                    link: '/faq.html',
                    questionId: parseInt(id)
                });
                console.log('✅ Bildirim gönderildi:', notification);
            } catch (notifError) {
                console.error('❌ Bildirim gönderme hatası:', notifError);
            }
        } else {
            console.log('⏭️ Bildirim gönderilmedi. Sebep:', {
                hasOldFaq: !!oldFaq,
                hasUserId: !!oldFaq?.user_id,
                hasAnswer: !!(answer && answer.trim() !== ''),
                isDifferent: answer !== oldFaq?.answer
            });
        }
        
        res.json({ message: 'SSS güncellendi.' });
    } catch (err) {
        console.error('SSS güncellenirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

// SSS sil (admin)
router.delete('/faq/:id', [authenticateToken, authorizeAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM faq WHERE id = $1', [id]);
        res.json({ message: 'SSS silindi.' });
    } catch (err) {
        console.error('SSS silinirken hata:', err);
        res.status(500).json({ error: 'Sunucuda bir hata oluştu.' });
    }
});

module.exports = router;
