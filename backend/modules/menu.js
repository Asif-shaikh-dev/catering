// menu.js
const express = require('express');
const pool = require('../config/db');
const { renderPage, renderMessagePage } = require('../templates/layout');
const { renderAdminTablePage } = require('../templates/adminTable');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { escapeHtml: esc, raw, code, formatMoney, toId, statusBadge } = require('../utils/format');
const { menuCardHtml } = require('../templates/cards');

const router = express.Router();

const CATEGORY_ORDER = ['Starter', 'Main Course', 'Dessert', 'Drinks'];
const STATUSES = ['Available', 'Unavailable'];

router.get(
  '/menu',
  asyncHandler(async (req, res) => {
    // Only dishes marked Available are shown to customers
    const { rows } = await pool.query("SELECT * FROM menu_items WHERE status = 'Available' ORDER BY category, name");

    const present = [...new Set(rows.map((r) => r.category))];
    const categories = [
      ...CATEGORY_ORDER.filter((c) => present.includes(c)),
      ...present.filter((c) => !CATEGORY_ORDER.includes(c)),
    ];

    const sections = categories.length
      ? categories
          .map((category) => {
            const items = rows.filter((r) => r.category === category);
            const cardsHtml = items.map(menuCardHtml).join('\n');
            const anchor = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return `
      <section class="popular-menu" id="${esc(anchor)}">
        <div class="section-title">
          <p>${esc(category.toUpperCase())}</p>
          <h2>Our ${esc(category)}</h2>
        </div>
        <div class="menu-container">${cardsHtml}</div>
      </section>`;
          })
          .join('\n')
      : `<section class="popular-menu"><div class="section-title"><p>COMING SOON</p><h2>Our menu is being updated</h2></div></section>`;

    const cta = `
  <section class="booking-cta">
    <div class="cta-content">
      <p>PLANNING AN EVENT?</p>
      <h2>Make Your Event Delicious</h2>
      <p>Need food for a wedding, party or corporate event? Book our catering packages for large groups.</p>
      <a href="/booking" class="btn">Book Your Event</a>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: 'Menu',
        activeKey: 'menu',
        req,
        banner: { eyebrow: 'OUR SPECIAL MENU', title: 'Delicious Food', breadcrumb: 'Home / Menu' },
        body: sections + cta,
        scripts: ['/js/menuPublic.js'],
      })
    );
  })
);

router.get(
  '/item-details/:id',
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id); // "/item-details/abc" used to crash the query with a PostgreSQL error
    const { rows } = id ? await pool.query("SELECT * FROM menu_items WHERE id = $1 AND status = 'Available'", [id]) : { rows: [] };
    const item = rows[0];
    if (!item) {
      return res.status(404).send(
        renderMessagePage({
          req,
          title: 'Item not found',
          heading: 'Item not found',
          message: 'This menu item does not exist or is no longer available.',
          linkHref: '/menu',
          linkLabel: 'Back to menu',
        })
      );
    }

    const body = `
  <section class="item-details-section">
    <div class="item-details-container">
      <div class="item-details-image">
        <img src="/images/${encodeURIComponent(item.image || 'catering.jpg')}" alt="${esc(item.name)}">
      </div>
      <div class="item-details-info" data-id="${Number(item.id)}" data-price="${Number(item.price)}" data-name="${esc(item.name)}">
        <h1>${esc(item.name)}</h1>
        <p class="description">${esc(item.description || 'Delicious food prepared specially for your event.')}</p>
        <div class="item-price">Price: <span id="itemPrice">${formatMoney(item.price)}</span></div>
        <div class="quantity-box">
          <button type="button" id="minusBtn">−</button>
          <span id="quantity">1</span>
          <button type="button" id="plusBtn">+</button>
        </div>
        <div class="item-total-price">Total: <span id="totalPrice">${formatMoney(item.price)}</span></div>
        <a href="/order?item=${Number(item.id)}&amp;qty=1" class="btn" id="orderBtn">Order Now</a>
        <br>
        <a href="/menu" class="back-btn">← Back to Menu</a>
      </div>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: item.name,
        req,
        banner: { eyebrow: 'MENU ITEM', title: 'Item Details', breadcrumb: 'Home / Menu / Details' },
        body,
        scripts: ['/js/itemDetails.js'],
      })
    );
  })
);

router.get(
  '/admin/menu',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM menu_items ORDER BY id');

    const tableRows = rows.map((item) => ({
      id: item.id,
      itemId: code('MENU', item.id),
      name: item.name,
      category: item.category,
      price: formatMoney(item.price),
      status: raw(statusBadge(item.status)),
      actions: raw('<button class="action-btn edit-btn">Edit</button><button class="action-btn delete-btn">Delete</button>'),
      _data: {
        name: item.name,
        category: item.category,
        price: Number(item.price),
        description: item.description || '',
        image: item.image || '',
        status: item.status,
      },
    }));

    res.send(
      renderAdminTablePage({
        req,
        title: 'Menu Management',
        eyebrow: 'ADMIN PANEL',
        breadcrumb: 'Dashboard / Menu',
        activeKey: 'menu',
        heading: 'Manage Menu Items',
        subheading: 'MENU MANAGEMENT',
        addButton: { id: 'addMenuBtn', label: 'Add Menu Item' },
        columns: [
          { key: 'itemId', label: 'Item ID' },
          { key: 'name', label: 'Item Name' },
          { key: 'category', label: 'Category' },
          { key: 'price', label: 'Price' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Action' },
        ],
        rows: tableRows,
        emptyMessage: 'No menu items yet.',
        tableId: 'menuTable',
        scripts: ['/js/adminCrud.js', '/js/menuAdmin.js'],
      })
    );
  })
);

// ---------------- API ----------------

function readItem(input) {
  const name = String(input.name ?? '').trim();
  let category = String(input.category ?? '').trim();
  const price = Number(input.price);
  const description = String(input.description ?? '').trim();
  const image = String(input.image ?? '').trim();
  const status = input.status || 'Available';

  if (!name || name.length > 120) return { error: 'Name is required (max 120 characters).' };
  if (!category || category.length > 50) return { error: 'Category is required (max 50 characters).' };
  if (input.price === '' || input.price === null || !Number.isFinite(price) || price < 0) return { error: 'Price must be a valid number.' };
  if (description.length > 500) return { error: 'Description is too long (max 500 characters).' };
  if (image && !/^[\w\-. ]+\.(jpe?g|png|webp|gif|jfif)$/i.test(image)) {
    return { error: 'Image must be a file name from the images folder, e.g. paneer-tikka.jpg' };
  }
  if (!STATUSES.includes(status)) return { error: 'Status must be Available or Unavailable.' };

  // "starter" / "STARTER" -> "Starter" so categories don't split into duplicates
  category = CATEGORY_ORDER.find((c) => c.toLowerCase() === category.toLowerCase()) || category;

  return { value: { name, category, price, description: description || null, image: image || null, status } };
}

router.post(
  '/api/menu',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { error, value } = readItem(req.body || {});
    if (error) return res.status(400).json({ error });

    const { rows } = await pool.query(
      'INSERT INTO menu_items (name, category, price, description, image, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [value.name, value.category, value.price, value.description, value.image, value.status]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/api/menu/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });

    const current = (await pool.query('SELECT * FROM menu_items WHERE id = $1', [id])).rows[0];
    if (!current) return res.status(404).json({ error: 'Menu item not found.' });

    // Merge so a partial request can no longer overwrite missing fields with NULL
    const { error, value } = readItem({ ...current, ...(req.body || {}) });
    if (error) return res.status(400).json({ error });

    const { rows } = await pool.query(
      'UPDATE menu_items SET name=$1, category=$2, price=$3, description=$4, image=$5, status=$6 WHERE id=$7 RETURNING *',
      [value.name, value.category, value.price, value.description, value.image, value.status, id]
    );
    res.json(rows[0]);
  })
);

router.delete(
  '/api/menu/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });
    const { rowCount } = await pool.query('DELETE FROM menu_items WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Menu item not found.' });
    res.json({ message: 'Deleted.' });
  })
);

module.exports = router;