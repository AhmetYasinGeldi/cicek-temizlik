require('dotenv').config();
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('.'));
app.use(express.json());

const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const settingsRoutes = require('./routes/settings');

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/settings', settingsRoutes);

app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde başarıyla başlatıldı!`);
});