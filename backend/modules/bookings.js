const express = require('express');
const pool = require('../config/db');
const { renderPage, renderMessagePage } = require('../templates/layout');
const { renderAdminTablePage, statusSelect } = require('../templates/adminTable');
const { requireAdmin, requireCustomer } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const rateLimit = require('../utils/rateLimit');
const { LATEST_PAYMENT_JOIN } = require('../utils/sql');
const { str, isEmail, isPhone } = require('../utils/validate');
const {
  escapeHtml: esc,
  code,
  formatMoney,
  formatDate,
  todayISO,
  isValidISODate,
  toId,
  calcTotal,
  statusBadge,
} = require('../utils/format');

const router = express.Router();
const bookingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many booking attempts. Please try again later.' });

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Party', 'Outdoor', 'Other'];
const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Cancelled'];

router.get(
  '/booking',
  asyncHandler(async (req, res) => {
    const { rows: packages } = await pool.query('SELECT * FROM packages WHERE status = $1 ORDER BY price_per_person', ['Available']);

    const packageOptions = packages
      .map(
        (p) =>
          `<option value="${p.id}" data-max="${Number(p.max_guests) || ''}">${esc(p.name)} - ${formatMoney(p.price_per_person)} / Person (up to ${esc(p.max_guests || '—')} guests)</option>`
      )
      .join('\n');

    const body = `
  <section class="booking-section">
    <div class="section-title">
      <p>BOOKING FORM</p>
      <h2>Plan Your Perfect Event</h2>
    </div>
    <div class="booking-container">
      <div class="booking-form">
        <h2>Enter Your Event Details</h2>
        <form id="bookingForm">
          <div class="form-row">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" placeholder="Enter your full name" required>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" placeholder="Enter your email" required>
            </div>
          </div>
          <div class="form-group">
            <label for="phone">Phone Number</label>
            <input type="tel" id="phone" placeholder="Enter your phone number" required>
          </div>
          <div class="form-group">
            <label for="event">Event Type</label>
            <select id="event" required>
              <option value="">Select Event Type</option>
              <option value="Wedding">Wedding</option>
              <option value="Birthday">Birthday</option>
              <option value="Corporate">Corporate Event</option>
              <option value="Party">Party</option>
              <option value="Outdoor">Outdoor Event</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="date">Event Date</label>
              <input type="date" id="date" min="${todayISO()}" required>
            </div>
            <div class="form-group">
              <label for="guests">Number of Guests</label>
              <input type="number" id="guests" min="1" step="1" placeholder="Number of guests" required>
            </div>
          </div>
          <div class="form-group">
            <label for="package">Select Package</label>
            <select id="package" required>
              <option value="">Select Package</option>
              ${packageOptions}
            </select>
          </div>
          <div class="form-group">
            <label for="message">Additional Requirements</label>
            <textarea id="message" rows="5" maxlength="1000" placeholder="Enter any special requirements..."></textarea>
          </div>
          <button type="submit" class="btn">Submit Booking</button>
        </form>
        <p id="bookingError" class="form-message"></p>
        <p id="successMessage" style="display:none;">🎉 Booking Successful! Redirecting to payment...</p>
      </div>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: 'Booking',
        activeKey: '',
        req,
        banner: { eyebrow: 'BOOK YOUR EVENT', title: 'Event Booking', breadcrumb: 'Home / Booking' },
        body,
        scripts: ['/js/booking.js'],
      })
    );
  })
);

router.get(
  '/my-bookings',
  requireCustomer,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT b.*, p.name AS package_name, p.price_per_person, pay.status AS payment_status
       FROM bookings b
       LEFT JOIN packages p ON p.id = b.package_id
       ${LATEST_PAYMENT_JOIN}
       WHERE b.customer_id = $1 ORDER BY b.created_at DESC`,
      [req.session.customerId]
    );

    const cardsHtml = rows.length
      ? rows
          .map((b) => {
            const needsPayment = b.status !== 'Cancelled' && (!b.payment_status || b.payment_status === 'Failed');
            return `
        <div class="booking-card">
          <div class="booking-header">
            <div>
              <h2>Booking ${code('CMS', b.id)}</h2>
              <p>${esc(b.event_type)} Catering</p>
            </div>
            <span class="booking-status ${b.status.toLowerCase()}">${esc(b.status)}</span>
          </div>
          <div class="booking-details-grid">
            <div><span>Customer Name</span><strong>${esc(b.name)}</strong></div>
            <div><span>Event Type</span><strong>${esc(b.event_type)}</strong></div>
            <div><span>Event Date</span><strong>${formatDate(b.event_date)}</strong></div>
            <div><span>Number of Guests</span><strong>${esc(b.guests)}</strong></div>
            <div><span>Package</span><strong>${esc(b.package_name || '-')}</strong></div>
            <div><span>Total Amount</span><strong>${formatMoney(calcTotal(b))}</strong></div>
            <div><span>Payment</span><strong>${esc(b.payment_status || 'Not paid')}</strong></div>
            <div><span>Status</span><strong>${esc(b.status)}</strong></div>
          </div>
          <div class="booking-card-footer">
            <a href="/confirmation/${b.id}" class="btn">View Details</a>
            ${needsPayment ? `<a href="/payment/${b.id}" class="btn">Pay Now</a>` : ''}
            <a href="/booking" class="btn">New Booking</a>
          </div>
        </div>`;
          })
          .join('\n')
      : `<p style="padding: 0 8%;">You have no bookings yet. <a href="/booking">Book your first event →</a></p>`;

    const body = `
  <section class="my-bookings-section">
    <div class="section-title"><p>BOOKING HISTORY</p><h2>Your Event Bookings</h2></div>
    <div class="bookings-container">${cardsHtml}</div>
  </section>`;

    res.send(
      renderPage({
        title: 'My Bookings',
        req,
        banner: { eyebrow: 'YOUR BOOKINGS', title: 'My Bookings', breadcrumb: 'Home / My Bookings' },
        body,
      })
    );
  })
);

router.get(
  '/admin/bookings',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT b.*, p.name AS package_name, p.price_per_person, pay.status AS payment_status
       FROM bookings b
       LEFT JOIN packages p ON p.id = b.package_id
       ${LATEST_PAYMENT_JOIN}
       ORDER BY b.created_at DESC`
    );

    const tableRows = rows.map((b) => ({
      id: b.id,
      bookingId: code('CMS', b.id),
      customer: b.name,
      event: b.event_type,
      date: formatDate(b.event_date),
      guests: b.guests,
      package: b.package_name || '-',
      total: formatMoney(calcTotal(b)),
      payment: { __html: b.payment_status ? statusBadge(b.payment_status) : '<span class="status pending">Not paid</span>' },
      status: statusSelect('/api/bookings', b.id, b.status, BOOKING_STATUSES),
    }));

    res.send(
      renderAdminTablePage({
        req,
        title: 'Manage Bookings',
        eyebrow: 'ADMIN PANEL',
        breadcrumb: 'Dashboard / Bookings',
        activeKey: 'bookings',
        heading: 'All Customer Bookings',
        subheading: 'BOOKING MANAGEMENT',
        addButton: null,
        columns: [
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'customer', label: 'Customer' },
          { key: 'event', label: 'Event' },
          { key: 'date', label: 'Date' },
          { key: 'guests', label: 'Guests' },
          { key: 'package', label: 'Package' },
          { key: 'total', label: 'Total' },
          { key: 'payment', label: 'Payment' },
          { key: 'status', label: 'Status' },
        ],
        rows: tableRows,
        emptyMessage: 'No bookings yet.',
        tableId: 'bookingsTable',
        scripts: ['/js/adminStatus.js'],
      })
    );
  })
);

// ---------------- API ----------------

router.post(
  '/api/bookings',
  bookingLimiter,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const name = str(b.name);
    const email = str(b.email).toLowerCase();
    const phone = str(b.phone);
    const eventType = str(b.event);
    const date = str(b.date);
    const guests = Number(b.guests);
    const packageId = toId(b.package);
    const message = str(b.message);

    if (!name || !email || !phone || !eventType || !date || !b.guests || !packageId) {
      return res.status(400).json({ error: 'Please fill all required fields.' });
    }
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Please enter a valid name.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
    if (!EVENT_TYPES.includes(eventType)) return res.status(400).json({ error: 'Please choose a valid event type.' });
    if (!isValidISODate(date)) return res.status(400).json({ error: 'Please choose a valid event date.' });
    if (date < todayISO()) return res.status(400).json({ error: 'Event date cannot be in the past.' });
    if (!Number.isInteger(guests) || guests < 1 || guests > 100000) {
      return res.status(400).json({ error: 'Number of guests must be a whole number of 1 or more.' });
    }
    if (message.length > 1000) return res.status(400).json({ error: 'Additional requirements are too long (max 1000 characters).' });

    // The package must exist, be available, and fit the guest count
    const { rows: pkgRows } = await pool.query('SELECT id, name, max_guests, status FROM packages WHERE id = $1', [packageId]);
    const pkg = pkgRows[0];
    if (!pkg || pkg.status !== 'Available') return res.status(400).json({ error: 'The selected package is not available.' });
    if (pkg.max_guests && guests > pkg.max_guests) {
      return res.status(400).json({ error: `${pkg.name} supports up to ${pkg.max_guests} guests. Choose a bigger package or fewer guests.` });
    }

    const { rows } = await pool.query(
      `INSERT INTO bookings (customer_id, name, email, phone, event_type, event_date, guests, package_id, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.session.customerId || null, name, email, phone, eventType, date, guests, packageId, message || null]
    );

    // Remember this booking in the browser session so a guest can open its payment/confirmation page
    const ids = Array.isArray(req.session.bookingIds) ? req.session.bookingIds : [];
    req.session.bookingIds = [...ids, rows[0].id].slice(-20);

    res.status(201).json({ id: rows[0].id, message: 'Booking created successfully!' });
  })
);

// Admin: change booking status (Pending / Confirmed / Cancelled)
router.put(
  '/api/bookings/:id/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    const status = (req.body || {}).status;
    if (!id) return res.status(400).json({ error: 'Invalid booking id.' });
    if (!BOOKING_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const { rows } = await pool.query('UPDATE bookings SET status = $1 WHERE id = $2 RETURNING id, status', [status, id]);
    if (!rows.length) return res.status(404).json({ error: 'Booking not found.' });
    res.json(rows[0]);
  })
);

module.exports = router;
