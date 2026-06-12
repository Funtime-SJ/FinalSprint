const express = require('express');
const db = require('../db');
const router = express.Router();

function requireLoginApi(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Authentication required' });
}

// Create product (seller must be logged in)
router.post('/', requireLoginApi, (req, res) => {
  const { title, price } = req.body;
  if (!title || price == null) return res.status(400).json({ error: 'Missing fields' });
  const stmt = db.prepare('INSERT INTO products (seller_id, title, price) VALUES (?, ?, ?)');
  stmt.run(req.session.userId, title, price, function (err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true, productId: this.lastID });
  });
  stmt.finalize();
});

// Edit product (only owner)
router.put('/:id', requireLoginApi, (req, res) => {
  const id = req.params.id;
  const { title, price } = req.body;
  db.get('SELECT seller_id, title, price FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    if (row.seller_id !== req.session.userId) return res.status(403).json({ error: 'Forbidden' });
    const newTitle = title || row.title;
    const newPrice = price == null ? row.price : price;
    const stmt = db.prepare('UPDATE products SET title = ?, price = ? WHERE id = ?');
    stmt.run(newTitle, newPrice, id, function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true });
    });
    stmt.finalize();
  });
});

// Delete product (only owner) — purchases cascade
router.delete('/:id', requireLoginApi, (req, res) => {
  const id = req.params.id;
  db.get('SELECT seller_id FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    if (row.seller_id !== req.session.userId) return res.status(403).json({ error: 'Forbidden' });
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id, function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true });
    });
    stmt.finalize();
  });
});

// Purchase product (buyer must be logged in)
router.post('/:id/purchase', requireLoginApi, (req, res) => {
  const id = req.params.id;
  const { quantity } = req.body;
  db.get('SELECT id FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    const stmt = db.prepare('INSERT INTO purchases (product_id, buyer_id, quantity) VALUES (?, ?, ?)');
    stmt.run(id, req.session.userId, quantity || 1, function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true, purchaseId: this.lastID });
    });
    stmt.finalize();
  });
});

// Seller: view orders for my products
router.get('/seller/orders', requireLoginApi, (req, res) => {
  const sellerId = req.session.userId;
  const sql = `SELECT purchases.id AS purchase_id, purchases.product_id, purchases.buyer_id, purchases.quantity, purchases.created_at, products.title
               FROM purchases JOIN products ON purchases.product_id = products.id
               WHERE products.seller_id = ?`;
  db.all(sql, [sellerId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ orders: rows });
  });
});

// Buyer: view my orders
router.get('/orders', requireLoginApi, (req, res) => {
  const buyerId = req.session.userId;
  const sql = `SELECT purchases.id AS purchase_id, purchases.product_id, purchases.quantity, purchases.created_at, products.title, products.seller_id
               FROM purchases JOIN products ON purchases.product_id = products.id
               WHERE purchases.buyer_id = ?`;
  db.all(sql, [buyerId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ orders: rows });
  });
});

module.exports = router;
