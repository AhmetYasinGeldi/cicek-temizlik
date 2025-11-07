require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Statik dosyaları 'public' klasöründen sun
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`👉 [İSTEK] ${req.method} ${req.url}`);
    next();
});

// Uploads klasörü için (NOT: Vercel'de yeni yüklemeler kalıcı olmaz, aşağıda açıkladım)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Diğer tüm GET isteklerini (frontend rotaları için) index.html'e yönlendir
// Bu, eğer ilerde React/Vue gibi SPA kullanırsan gerekli olabilir, şimdilik opsiyonel ama dursun zararı yok.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Sunucu http://localhost:${port} adresinde başarıyla başlatıldı!`);
    });
}

module.exports = app;