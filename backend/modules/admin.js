// admin.js 
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { renderPage } = require('../templates/layout');
const { renderAdminTablePage } = require('../templates/adminTable');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const rateLimit = require('../utils/rateLimit');
const { regenerate } = require('../utils/session');
const { str } = require('../utils/validate');
const { escapeHtml: esc, raw, code, formatMoney, formatDate, statusBadge } = require('../utils/format');

const router = express.Router();

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // keeps timing similar for unknown usernames
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Try again in 15 minutes.' });

router.get('/admin', (req, res) => res.redirect('/admin/dashboard'));

router.get('/admin-login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin/dashboard');

  const body = `
  <section class="auth-section">
    <div class="auth-container">
      <h2>Admin Login</h2>
      <p>Login to access the admin dashboard.</p>
      <form id="adminLoginForm">
        <div class="form-group">
          <label for="adminUsername">Username</label>
          <input type="text" id="adminUsername" placeholder="Enter admin username" required>
        </div>
        <div class="form-group">
          <label for="adminPassword">Password</label>
          <input type="password" id="adminPassword" placeholder="Enter admin password" required>
        </div>
        <button type="submit" class="btn">Login</button>
      </form>
      <p id="adminLoginMessage"></p>
    </div>
  </section>`;

  res.send(
    renderPage({
      title: 'Admin Login',
      req,
      banner: { eyebrow: 'ADMIN PANEL', title: 'Admin Login', breadcrumb: 'Home / Admin Login' },
      body,
      scripts: ['/js/adminLogin.js'],
    })
  );
});

router.get(
  '/admin/dashboard',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [bookingCount, customerCount, paymentTotal, menuCount, recentBookings] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM bookings'),
      pool.query('SELECT COUNT(*)::int AS count FROM customers'),
      pool.query("SELECT COALESCE(SUM(amount),0)::numeric AS total FROM payments WHERE status = 'Paid'"),
      pool.query('SELECT COUNT(*)::int AS count FROM menu_items'),
      pool.query(
        `SELECT b.id, b.name, b.event_type, b.event_date, b.status
         FROM bookings b ORDER BY b.created_at DESC LIMIT 5`
      ),
    ]);

    const rowsHtml = recentBookings.rows.length
      ? recentBookings.rows
          .map(
            (b) => `
          <tr>
            <td>${code('CMS', b.id)}</td>
            <td>${esc(b.name)}</td>
            <td>${esc(b.event_type)}</td>
            <td>${formatDate(b.event_date)}</td>
            <td>${statusBadge(b.status)}</td>
          </tr>`
          )
          .join('\n')
      : `<tr><td colspan="5">No bookings yet.</td></tr>`;

    const body = `
    <section class="admin-dashboard">
      <div class="dashboard-top">
        <div>
          <p>ADMIN PANEL</p>
          <h1>Dashboard</h1>
          <span>Welcome back, ${esc(req.session.adminUsername || 'Admin')}!</span>
        </div>
        <a href="/booking" class="btn">+ New Booking</a>
      </div>

      <div class="dashboard-cards">
        <div class="dashboard-card">
          <div class="card-icon">📋</div>
          <div><p>Total Bookings</p><h2>${bookingCount.rows[0].count}</h2></div>
          <a href="/admin/bookings">View Bookings →</a>
        </div>
        <div class="dashboard-card">
          <div class="card-icon">👥</div>
          <div><p>Total Customers</p><h2>${customerCount.rows[0].count}</h2></div>
          <a href="/admin/customers">View Customers →</a>
        </div>
        <div class="dashboard-card">
          <div class="card-icon">💳</div>
          <div><p>Payments Received</p><h2>${formatMoney(paymentTotal.rows[0].total)}</h2></div>
          <a href="/admin/payments">View Payments →</a>
        </div>
        <div class="dashboard-card">
          <div class="card-icon">🍽️</div>
          <div><p>Menu Items</p><h2>${menuCount.rows[0].count}</h2></div>
          <a href="/admin/menu">Manage Menu →</a>
        </div>
      </div>

      <div class="dashboard-content">
        <div class="recent-bookings">
          <div class="content-header">
            <h2>Recent Bookings</h2>
            <a href="/admin/bookings">View All</a>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>Booking ID</th><th>Customer</th><th>Event</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="quick-actions">
          <h2>Quick Actions</h2>
          <a href="/admin/bookings">📋 Manage Bookings</a>
          <a href="/admin/customers">👥 Manage Customers</a>
          <a href="/admin/payments">💳 Manage Payments</a>
          <a href="/admin/menu">🍽️ Manage Menu</a>
          <a href="/admin/packages">📦 Manage Packages</a>
          <a href="/admin/services">🛎️ Manage Services</a>
          <a href="/admin/messages">✉️ Contact Messages</a>
        </div>
      </div>
    </section>`;

    res.send(renderPage({ title: 'Admin Dashboard', isAdmin: true, activeKey: 'dashboard', req, body }));
  })
);

// Contact-form messages were saved to the DB but the admin could never read them.
router.get(
  '/admin/messages',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');

    const tableRows = rows.map((m) => ({
      id: m.id,
      messageId: code('MSG', m.id),
      name: m.name,
      email: m.email,
      phone: m.phone || '-',
      subject: m.subject || '-',
      message: raw(`<div class="message-cell">${esc(m.message)}</div>`),
      date: formatDate(m.created_at),
    }));

    res.send(
      renderAdminTablePage({
        req,
        title: 'Messages',
        eyebrow: 'ADMIN PANEL',
        breadcrumb: 'Dashboard / Messages',
        activeKey: 'messages',
        heading: 'Contact Messages',
        subheading: 'MESSAGES',
        addButton: null,
        columns: [
          { key: 'messageId', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'subject', label: 'Subject' },
          { key: 'message', label: 'Message' },
          { key: 'date', label: 'Date' },
        ],
        rows: tableRows,
        emptyMessage: 'No messages yet.',
        tableId: 'messagesTable',
      })
    );
  })
);

// ---------------- API ----------------

router.post(
  '/api/admin/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const username = str(body.username);
    const password = typeof body.password === 'string' ? body.password : '';

    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    const admin = result.rows[0];

    const ok = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);
    if (!admin || !ok) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    await regenerate(req);
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    res.json({ message: 'Admin login successful!' });
  })
);

router.get('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/admin-login');
  });
});

module.exports = router;
