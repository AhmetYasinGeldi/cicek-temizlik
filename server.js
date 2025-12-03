require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Statik dosyaları 'public' klasöründen sun
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


// Uploads klasörü için (NOT: Vercel'de yeni yüklemeler kalıcı olmaz, aşağıda açıkladım)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Artık gerek yok, public içinde

// Animations klasörü artık public içinde, ayrı servise gerek yok
// app.use('/animations', express.static(path.join(__dirname, 'animations')));

// Rota Tanımlamaları
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const settingsRoutes = require('./routes/settings');
const cardRoutes = require('./routes/cards');
const addressRoutes = require('./routes/addresses');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const contentRoutes = require('./routes/content');
const notificationRoutes = require('./routes/notifications');
const favoriteRoutes = require('./routes/favorites');

// API Rotaları
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);

// 404 Handler - Tüm bulunamayan rotalar için
app.use((req, res, next) => {
    // API route'ları için JSON 404 döndür
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint bulunamadı' });
    }
    // HTML sayfaları için 404.html göster
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Sunucu http://localhost:${port} adresinde başarıyla başlatıldı!`);
    });
}

module.exports = app;