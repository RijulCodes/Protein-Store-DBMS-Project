// controllers/productController.js
// CHANGED: Added image_url support throughout all functions

const db = require('../config/db');

// ── GET all products (with optional search, filtering, sorting, pagination) ───────────────────
async function getAll(req, res) {
  try {
    const { search, category, min_price, max_price, sort, page, limit } = req.query;

    let sql = 'SELECT * FROM Products WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM Products WHERE 1=1';
    const params = [];
    const countParams = [];

    // Filter by search
    if (search) {
      const searchPattern = `%${search}%`;
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      countSql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
    }

    // Filter by category
    if (category) {
      sql += ' AND category = ?';
      countSql += ' AND category = ?';
      params.push(category);
      countParams.push(category);
    }

    // Filter by min price
    if (min_price) {
      const minP = parseFloat(min_price);
      if (!isNaN(minP)) {
        sql += ' AND price >= ?';
        countSql += ' AND price >= ?';
        params.push(minP);
        countParams.push(minP);
      }
    }

    // Filter by max price
    if (max_price) {
      const maxP = parseFloat(max_price);
      if (!isNaN(maxP)) {
        sql += ' AND price <= ?';
        countSql += ' AND price <= ?';
        params.push(maxP);
        countParams.push(maxP);
      }
    }

    // Sorting - Whitelisted to prevent SQL injection
    const allowedSort = {
      price_asc: 'price ASC',
      price_desc: 'price DESC',
      newest: 'created_at DESC'
    };
    const sortClause = allowedSort[sort] || 'created_at DESC';
    sql += ` ORDER BY ${sortClause}`;

    // Pagination (Only if page or limit is explicitly requested)
    if (page || limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 8;
      const offsetNum = (pageNum - 1) * limitNum;

      // Get total count
      const [countRows] = await db.query(countSql, countParams);
      const total = countRows[0].total;

      // Retrieve limited data
      sql += ' LIMIT ? OFFSET ?';
      params.push(limitNum, offsetNum);

      const [rows] = await db.query(sql, params);
      
      res.json({
        products: rows,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      });
    } else {
      // Return a flat array of all products (backwards compatible)
      const [rows] = await db.query(sql, params);
      res.json(rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET single product ────────────────────────────────────────
async function getOne(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM Products WHERE product_id = ?', [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── POST create product (admin) ───────────────────────────────
// CHANGED: Now accepts image_url in request body
async function create(req, res) {
  try {
    const { name, category, description, price, stock, image_url } = req.body;
    if (!name || !category || !price)
      return res.status(400).json({ error: 'name, category and price are required' });

    const [result] = await db.query(
      `INSERT INTO Products (name, category, description, price, stock, in_stock, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, category, description || '', price, stock || 0,
       stock > 0 ? 1 : 0,
       image_url || null]   // CHANGED: store image_url or null
    );
    res.status(201).json({ message: 'Product created', product_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── PUT update product (admin) ────────────────────────────────
async function update(req, res) {
  try {
    const { name, category, description, price, stock, image_url } = req.body;
    const stockQty = parseInt(stock) || 0;
    // Auto-compute in_stock from stock — overrides any manual value sent from client
    const computedInStock = stockQty > 0 ? 1 : 0;
    await db.query(
      `UPDATE Products
       SET name=?, category=?, description=?, price=?, stock=?, in_stock=?, image_url=?
       WHERE product_id=?`,
      [name, category, description, price, stockQty, computedInStock,
       image_url || null,
       req.params.id]
    );
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── DELETE product (admin) ────────────────────────────────────
async function remove(req, res) {
  try {
    await db.query('DELETE FROM Products WHERE product_id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET product recommendations (based on order co-occurrence) ──
async function getRecommendations(req, res) {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Step 1: Query co-occurrences in order history
    const coOccurrenceQuery = `
      SELECT p.*, COUNT(*) as co_occurrence
      FROM Order_Items oi1
      JOIN Order_Items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id != oi2.product_id
      JOIN Products p ON oi2.product_id = p.product_id
      WHERE oi1.product_id = ? AND p.product_id != ?
      GROUP BY oi2.product_id
      ORDER BY co_occurrence DESC
      LIMIT 4
    `;

    const [coRows] = await db.query(coOccurrenceQuery, [productId, productId]);

    if (coRows.length > 0) {
      return res.json(coRows);
    }

    // Step 2: Fallback if no co-occurrence exists (same category, excluding current product)
    const [currentProduct] = await db.query('SELECT category FROM Products WHERE product_id = ?', [productId]);
    let fallbackQuery = 'SELECT * FROM Products WHERE product_id != ?';
    const fallbackParams = [productId];

    if (currentProduct.length > 0) {
      fallbackQuery += ' AND category = ?';
      fallbackParams.push(currentProduct[0].category);
    }
    fallbackQuery += ' ORDER BY RAND() LIMIT 4';

    const [fallbackRows] = await db.query(fallbackQuery, fallbackParams);
    res.json(fallbackRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET categories list ───────────────────────────────────────
async function getCategories(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT category FROM Products ORDER BY category'
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, getOne, create, update, remove, getCategories, getRecommendations };