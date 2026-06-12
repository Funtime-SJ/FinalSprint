const express = require('express');
const session = require('express-session');
const path = require('path');
const auth = require('./routes/auth');
const products = require('./routes/products');
require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// handle JSON parse errors gracefully
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err && err instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON' });
  next(err);
});
app.use(session({
  secret: 'change-me',
  resave: false,
  saveUninitialized: false,
}));

app.use('/auth', auth);
app.use('/products', products);

app.get('/products.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});
app.get('/seller-products.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'seller-products.html'));
});
app.get('/orders.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});
app.get('/seller-orders.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'seller-orders.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login.html');
}

app.get('/dashboard', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
