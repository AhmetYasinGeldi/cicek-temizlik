require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('.'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

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

app.get('/user-settings.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'user-settings.html'));
});

app.get('/my-cards.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'my-cards.html'));
});

app.get('/my-addresses.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'my-addresses.html'));
});

app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde başarıyla başlatıldı!`);
});

// Added a comment to trigger server reload if configured for it.