//services.js
const express = require('express');
const pool = require('../config/db');
const { renderPage } = require('../templates/layout');
const { renderAdminTablePage } = require('../templates/adminTable');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { raw, code, formatMoney, toId, statusBadge } = require('../utils/format');
const { serviceCardHtml } = require('../templates/cards');

const router = express.Router();
const STATUSES = ['Available', 'Unavailable'];

router.get(
  '/services',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM services WHERE status = $1 ORDER BY id', ['Available']);

    const cardsHtml = rows.map((s, i) => serviceCardHtml(s, i)).join('\n');

    const body = `
  <section class="services">
    <div class="section-title"><p>OUR CATERING SERVICES</p><h2>Perfect Service For Every Event</h2></div>
    <div class="service-container">${cardsHtml}</div>
  </section>
  <section class="booking-cta">
    <div class="cta-content">
      <p>PLAN YOUR EVENT WITH US</p>
      <h2>Let's Make Your Celebration Special</h2>
      <p>Delicious food, professional service and complete catering solutions for your memorable event.</p>
      <a href="/booking" class="btn">Book Your Event</a>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: 'Services',
        activeKey: 'services',
        req,
        banner: { eyebrow: 'WHAT WE OFFER', title: 'Our Services', breadcrumb: 'Home / Services' },
        body,
      })
    );
  })
);

router.get(
  '/admin/services',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM services ORDER BY id');

    const tableRows = rows.map((s) => ({
      id: s.id,
      serviceId: code('SRV', s.id),
      name: s.name,
      description: s.description,
      price: formatMoney(s.price),
      status: raw(statusBadge(s.status)),
      actions: raw('<button class="action-btn edit-service">Edit</button><button class="action-btn delete-btn">Delete</button>'),
      _data: { name: s.name, description: s.description || '', price: Number(s.price), status: s.status },
    }));

    res.send(
      renderAdminTablePage({
        req,
        title: 'Services Management',
        eyebrow: 'ADMIN PANEL',
        breadcrumb: 'Dashboard / Services',
        activeKey: 'services',
        heading: 'Manage Catering Services',
        subheading: 'SERVICE MANAGEMENT',
        addButton: { id: 'addServiceBtn', label: 'Add Service' },
        columns: [
          { key: 'serviceId', label: 'Service ID' },
          { key: 'name', label: 'Service Name' },
          { key: 'description', label: 'Description' },
          { key: 'price', label: 'Price' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Action' },
        ],
        rows: tableRows,
        emptyMessage: 'No services yet.',
        tableId: 'serviceTable',
        scripts: ['/js/adminCrud.js', '/js/servicesAdmin.js'],
      })
    );
  })
);

// ---------------- API ----------------

function readService(input) {
  const name = String(input.name ?? '').trim();
  const description = String(input.description ?? '').trim();
  const price = Number(input.price);
  const status = input.status || 'Available';

  if (!name || name.length > 100) return { error: 'Service name is required (max 100 characters).' };
  if (!description || description.length > 500) return { error: 'Description is required (max 500 characters).' };
  if (input.price === '' || input.price === null || !Number.isFinite(price) || price < 0) return { error: 'Price must be a valid number.' };
  if (!STATUSES.includes(status)) return { error: 'Status must be Available or Unavailable.' };

  return { value: { name, description, price, status } };
}

router.post(
  '/api/services',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { error, value } = readService(req.body || {});
    if (error) return res.status(400).json({ error });

    const { rows } = await pool.query(
      'INSERT INTO services (name, description, price, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [value.name, value.description, value.price, value.status]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/api/services/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });

    const current = (await pool.query('SELECT * FROM services WHERE id = $1', [id])).rows[0];
    if (!current) return res.status(404).json({ error: 'Service not found.' });

    const { error, value } = readService({ ...current, ...(req.body || {}) });
    if (error) return res.status(400).json({ error });

    const { rows } = await pool.query(
      'UPDATE services SET name=$1, description=$2, price=$3, status=$4 WHERE id=$5 RETURNING *',
      [value.name, value.description, value.price, value.status, id]
    );
    res.json(rows[0]);
  })
);

router.delete(
  '/api/services/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });
    const { rowCount } = await pool.query('DELETE FROM services WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Service not found.' });
    res.json({ message: 'Deleted.' });
  })
);

module.exports = router;
