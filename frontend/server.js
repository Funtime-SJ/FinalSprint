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
app.use(session({
  secret: 'change-me',
  resave: false,
  saveUninitialized: false,
}));

app.use('/auth', auth);
app.use('/products', products);

app.use(express.static(path.join(__dirname, 'public')));

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login.html');
}

app.get('/dashboard', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
