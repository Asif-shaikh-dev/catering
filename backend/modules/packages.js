const express = require('express');
const pool = require('../config/db');
const { renderPage } = require('../templates/layout');
const { renderAdminTablePage } = require('../templates/adminTable');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { raw, code, formatMoney, toId, statusBadge } = require('../utils/format');
const { packageCardHtml } = require('../templates/cards');

const router = express.Router();
const STATUSES = ['Available', 'Unavailable'];

router.get(
  '/packages',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM packages WHERE status = $1 ORDER BY price_per_person', ['Available']);
    const middleIndex = Math.floor(rows.length / 2);

    const cardsHtml = rows.map((pkg, i) => packageCardHtml(pkg, i === middleIndex)).join('\n');

    const body = `
  <section class="packages">
    <div class="section-title"><p>OUR PACKAGES</p><h2>Choose The Perfect Package</h2></div>
    <div class="package-container">${cardsHtml}</div>
  </section>
  <section class="booking-cta">
    <div class="cta-content">
      <p>READY TO PLAN YOUR EVENT?</p>
      <h2>Choose Your Perfect Catering Package</h2>
      <p>Delicious food and professional catering for your special occasion.</p>
      <a href="/booking" class="btn">Book Your Event</a>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: 'Packages',
        activeKey: 'packages',
        req,
        banner: { eyebrow: 'CHOOSE YOUR PACKAGE', title: 'Our Catering Packages', breadcrumb: 'Home / Packages' },
        body,
      })
    );
  })
);

router.get(
  '/admin/packages',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM packages ORDER BY id');

    const tableRows = rows.map((pkg) => ({
      id: pkg.id,
      packageId: code('PKG', pkg.id),
      name: pkg.name,
      category: pkg.category,
      price: formatMoney(pkg.price_per_person),
      guests: pkg.max_guests,
      status: raw(statusBadge(pkg.status)),
      actions: raw('<button class="action-btn edit-package">Edit</button><button class="action-btn delete-btn">Delete</button>'),
      _data: {
        name: pkg.name,
        category: pkg.category,
        price: Number(pkg.price_per_person),
        guests: pkg.max_guests,
        status: pkg.status,
      },
    }));

    res.send(
      renderAdminTablePage({
        req,
        title: 'Packages Management',
        eyebrow: 'ADMIN PANEL',
        breadcrumb: 'Dashboard / Packages',
        activeKey: 'packages',
        heading: 'Manage Catering Packages',
        subheading: 'PACKAGE MANAGEMENT',
        addButton: { id: 'addPackageBtn', label: 'Add Package' },
        columns: [
          { key: 'packageId', label: 'Package ID' },
          { key: 'name', label: 'Package Name' },
          { key: 'category', label: 'Category' },
          { key: 'price', label: 'Price / Person' },
          { key: 'guests', label: 'Max Guests' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Action' },
        ],
        rows: tableRows,
        emptyMessage: 'No packages yet.',
        tableId: 'packageTable',
        scripts: ['/js/adminCrud.js', '/js/packagesAdmin.js'],
      })
    );
  })
);

// ---------------- API ----------------

function readPackage(input) {
  const name = String(input.name ?? '').trim();
  const category = String(input.category ?? '').trim();
  const price = Number(input.price);
  const guests = Number(input.guests);
  const status = input.status || 'Available';

  if (!name || name.length > 100) return { error: 'Package name is required (max 100 characters).' };
  if (!category || category.length > 50) return { error: 'Category is required (max 50 characters).' };
  if (input.price === '' || input.price === null || !Number.isFinite(price) || price <= 0) return { error: 'Price must be a number greater than 0.' };
  if (!Number.isInteger(guests) || guests < 1) return { error: 'Max guests must be a whole number of 1 or more.' };
  if (!STATUSES.includes(status)) return { error: 'Status must be Available or Unavailable.' };

  return { value: { name, category, price, guests, status } };
}

router.post(
  '/api/packages',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { error, value } = readPackage(req.body || {});
    if (error) return res.status(400).json({ error });

    const { rows } = await pool.query(
      'INSERT INTO packages (name, category, price_per_person, max_guests, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [value.name, value.category, value.price, value.guests, value.status]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/api/packages/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });

    const current = (await pool.query('SELECT * FROM packages WHERE id = $1', [id])).rows[0];
    if (!current) return res.status(404).json({ error: 'Package not found.' });

    const { error, value } = readPackage({
      name: current.name,
      category: current.category,
      price: current.price_per_person,
      guests: current.max_guests,
      status: current.status,
      ...(req.body || {}),
    });
    if (error) return res.status(400).json({ error });

    const { rows } = await pool.query(
      'UPDATE packages SET name=$1, category=$2, price_per_person=$3, max_guests=$4, status=$5 WHERE id=$6 RETURNING *',
      [value.name, value.category, value.price, value.guests, value.status, id]
    );
    res.json(rows[0]);
  })
);

router.delete(
  '/api/packages/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });
    try {
      const { rowCount } = await pool.query('DELETE FROM packages WHERE id = $1', [id]);
      if (!rowCount) return res.status(404).json({ error: 'Package not found.' });
      res.json({ message: 'Deleted.' });
    } catch (err) {
      // foreign_key_violation: bookings still point at this package
      if (err.code === '23503') {
        return res.status(409).json({ error: 'This package is used by existing bookings and cannot be deleted. Edit it and set Status to Unavailable instead.' });
      }
      throw err;
    }
  })
);

module.exports = router;
