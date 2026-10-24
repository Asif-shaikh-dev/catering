// payments.js
const express = require('express');
const pool = require('../config/db');
const { renderPage, renderMessagePage } = require('../templates/layout');
const { renderAdminTablePage, statusSelect } = require('../templates/adminTable');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { canAccessBooking } = require('../utils/access');
const { LATEST_PAYMENT_JOIN } = require('../utils/sql');
const { str } = require('../utils/validate');
const { escapeHtml: esc, code, formatMoney, formatDate, toId, calcTotal, statusBadge } = require('../utils/format');

const router = express.Router();

const METHODS = ['UPI', 'Card', 'Cash'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed'];

function notFound(req, res) {
  return res.status(404).send(
    renderMessagePage({
      req,
      title: 'Booking not found',
      heading: 'Booking not found',
      message: 'We could not find this booking, or it belongs to a different account.',
      linkHref: '/booking',
      linkLabel: 'Make a booking',
    })
  );
}

router.get(
  '/payment/:bookingId',
  asyncHandler(async (req, res) => {
    const id = toId(req.params.bookingId);
    if (!id) return notFound(req, res);

    const { rows } = await pool.query(
      `SELECT b.*, p.name AS package_name, p.price_per_person, pay.status AS payment_status
       FROM bookings b
       LEFT JOIN packages p ON p.id = b.package_id
       ${LATEST_PAYMENT_JOIN}
       WHERE b.id = $1`,
      [id]
    );
    const booking = rows[0];
    // Same page for "missing" and "not yours" so ids can't be enumerated
    if (!booking || !canAccessBooking(req, booking)) return notFound(req, res);

    if (booking.payment_status === 'Paid' || booking.payment_status === 'Pending') {
      return res.redirect(`/confirmation/${booking.id}`);
    }
    if (booking.status === 'Cancelled') {
      return res.send(
        renderMessagePage({
          req,
          title: 'Booking cancelled',
          heading: 'Booking cancelled',
          message: 'This booking was cancelled, so payment is no longer possible.',
          linkHref: '/booking',
          linkLabel: 'Make a new booking',
        })
      );
    }

    const total = calcTotal(booking);

    const body = `
  <section class="payment-section">
    <div class="section-title"><p>PAYMENT DETAILS</p><h2>Complete Your Payment</h2></div>
    <div class="payment-container">
      <div class="payment-summary">
        <h2>Booking Summary</h2>
        <div class="summary-item"><span>Customer Name</span><strong>${esc(booking.name)}</strong></div>
        <div class="summary-item"><span>Booking ID</span><strong>${code('CMS', booking.id)}</strong></div>
        <div class="summary-item"><span>Selected Package</span><strong>${esc(booking.package_name || '-')}</strong></div>
        <div class="summary-item"><span>Number of Guests</span><strong>${esc(booking.guests)}</strong></div>
        <div class="summary-total"><span>Total Amount</span><strong>${formatMoney(total)}</strong></div>
      </div>
      <div class="payment-form">
        <h2>Choose Payment Method</h2>
        <form id="paymentForm" data-booking-id="${booking.id}">
          <div class="payment-methods">
            <label><input type="radio" name="payment" value="UPI" checked> UPI</label>
            <label><input type="radio" name="payment" value="Card"> Card</label>
            <label><input type="radio" name="payment" value="Cash"> Cash</label>
          </div>
          <div class="form-group" id="upiGroup">
            <label for="upi">UPI ID</label>
            <input type="text" id="upi" placeholder="example@upi">
          </div>
          <div class="form-group">
            <label for="payerName">Name on Payment</label>
            <input type="text" id="payerName" placeholder="Enter your name" value="${esc(booking.name)}" required>
          </div>
          <button type="submit" class="btn">Pay ${formatMoney(total)}</button>
        </form>
        <p id="paymentError" class="form-message"></p>
        <p id="paymentSuccess" style="display:none;">🎉 Payment received! Redirecting...</p>
      </div>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: 'Payment',
        req,
        banner: { eyebrow: 'SECURE PAYMENT', title: 'Payment', breadcrumb: 'Home / Payment' },
        body,
        scripts: ['/js/payment.js'],
      })
    );
  })
);

router.get(
  '/confirmation/:bookingId',
  asyncHandler(async (req, res) => {
    const id = toId(req.params.bookingId);
    if (!id) return notFound(req, res);

    const { rows } = await pool.query(
      `SELECT b.*, p.name AS package_name, p.price_per_person,
              pay.status AS payment_status, pay.method AS payment_method
       FROM bookings b
       LEFT JOIN packages p ON p.id = b.package_id
       ${LATEST_PAYMENT_JOIN}
       WHERE b.id = $1`,
      [id]
    );
    const booking = rows[0];
    if (!booking || !canAccessBooking(req, booking)) return notFound(req, res);

    // The old page always said "Booking Confirmed!" - even for unpaid or cancelled bookings.
    let icon = '⏳';
    let heading = 'Booking Received';
    let note = 'Your booking is waiting for confirmation.';
    let bannerEyebrow = 'BOOKING RECEIVED';
    if (booking.status === 'Confirmed') {
      icon = '✓';
      heading = 'Booking Confirmed!';
      note = 'Your booking is confirmed.';
      bannerEyebrow = 'BOOKING CONFIRMED';
    } else if (booking.status === 'Cancelled') {
      icon = '✕';
      heading = 'Booking Cancelled';
      note = 'This booking has been cancelled.';
      bannerEyebrow = 'BOOKING CANCELLED';
    }

    const needsPayment = booking.status !== 'Cancelled' && (!booking.payment_status || booking.payment_status === 'Failed');

    const body = `
  <section class="confirmation-section">
    <div class="confirmation-card">
      <div class="success-icon">${icon}</div>
      <h1>${heading}</h1>
      <p class="confirmation-message">Thank you for choosing our catering service, ${esc(booking.name)}. ${note} Current status: <strong>${esc(booking.status)}</strong>.</p>
      <div class="booking-details">
        <div class="detail-item"><span>Booking ID</span><strong>${code('CMS', booking.id)}</strong></div>
        <div class="detail-item"><span>Event Date</span><strong>${formatDate(booking.event_date)}</strong></div>
        <div class="detail-item"><span>Number of Guests</span><strong>${esc(booking.guests)}</strong></div>
        <div class="detail-item"><span>Package</span><strong>${esc(booking.package_name || '-')}</strong></div>
        <div class="detail-item"><span>Total Amount</span><strong>${formatMoney(calcTotal(booking))}</strong></div>
        <div class="detail-item"><span>Payment Method</span><strong>${esc(booking.payment_method || '-')}</strong></div>
        <div class="detail-item"><span>Payment Status</span><strong>${esc(booking.payment_status || 'Pending')}</strong></div>
        <div class="detail-item"><span>Booking Status</span><strong>${esc(booking.status)}</strong></div>
      </div>
      <div class="confirmation-buttons">
        ${needsPayment ? `<a href="/payment/${booking.id}" class="btn">Pay Now</a>` : ''}
        <a href="/" class="btn">Back To Home</a>
        <a href="/my-bookings" class="btn">My Bookings</a>
      </div>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: heading,
        req,
        banner: { eyebrow: bannerEyebrow, title: 'Confirmation', breadcrumb: 'Home / Confirmation' },
        body,
      })
    );
  })
);

router.get(
  '/admin/payments',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT pay.*, b.name AS customer_name, p.name AS package_name
       FROM payments pay
       JOIN bookings b ON b.id = pay.booking_id
       LEFT JOIN packages p ON p.id = b.package_id
       ORDER BY pay.created_at DESC`
    );

    const tableRows = rows.map((pay) => ({
      id: pay.id,
      paymentId: code('PAY', pay.id),
      bookingId: code('CMS', pay.booking_id),
      customer: pay.customer_name,
      package: pay.package_name || '-',
      amount: formatMoney(pay.amount),
      method: pay.method,
      date: formatDate(pay.created_at),
      status: statusSelect('/api/payments', pay.id, pay.status, PAYMENT_STATUSES),
    }));

    res.send(
      renderAdminTablePage({
        req,
        title: 'Payments',
        eyebrow: 'ADMIN PANEL',
        breadcrumb: 'Dashboard / Payments',
        activeKey: 'payments',
        heading: 'All Customer Payments',
        subheading: 'PAYMENT MANAGEMENT',
        addButton: null,
        columns: [
          { key: 'paymentId', label: 'Payment ID' },
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'customer', label: 'Customer' },
          { key: 'package', label: 'Package' },
          { key: 'amount', label: 'Amount' },
          { key: 'method', label: 'Payment Method' },
          { key: 'date', label: 'Date' },
          { key: 'status', label: 'Status' },
        ],
        rows: tableRows,
        emptyMessage: 'No payments yet.',
        tableId: 'paymentsTable',
        scripts: ['/js/adminStatus.js'],
      })
    );
  })
);

// ---------------- API ----------------

// NOTE: this is a simulated checkout (no real payment gateway is called).
// The amount is calculated on the server - the old version trusted whatever
// "amount" the browser sent, so anyone could pay ₹1 for a ₹50,000 booking.
router.post(
  '/api/payments',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const bookingId = toId(b.bookingId);
    const method = str(b.method);
    const upi = str(b.upi);

    if (!bookingId || !METHODS.includes(method)) return res.status(400).json({ error: 'Missing payment details.' });
    if (method === 'UPI' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
      return res.status(400).json({ error: 'Please enter a valid UPI ID (for example name@upi).' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the booking row so two simultaneous clicks cannot create two payments
      const { rows } = await client.query(
        `SELECT b.*, p.price_per_person
         FROM bookings b LEFT JOIN packages p ON p.id = b.package_id
         WHERE b.id = $1 FOR UPDATE OF b`,
        [bookingId]
      );
      const booking = rows[0];
      if (!booking || !canAccessBooking(req, booking)) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Booking not found.' });
      }
      if (booking.status === 'Cancelled') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'This booking was cancelled.' });
      }

      const existing = await client.query(
        "SELECT 1 FROM payments WHERE booking_id = $1 AND status IN ('Paid','Pending') LIMIT 1",
        [bookingId]
      );
      if (existing.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'A payment already exists for this booking.' });
      }

      const amount = calcTotal(booking);
      if (amount <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'This booking has no payable amount (package missing).' });
      }

      // Cash is collected later by the admin, so it stays "Pending" until the admin marks it Paid.
      const paymentStatus = method === 'Cash' ? 'Pending' : 'Paid';
      await client.query('INSERT INTO payments (booking_id, amount, method, status) VALUES ($1,$2,$3,$4)', [
        bookingId,
        amount,
        method,
        paymentStatus,
      ]);
      if (paymentStatus === 'Paid') {
        await client.query("UPDATE bookings SET status = 'Confirmed' WHERE id = $1", [bookingId]);
      }

      await client.query('COMMIT');
      res.status(201).json({
        message: paymentStatus === 'Paid' ? 'Payment successful!' : 'Booking saved. Please pay in cash on the event day.',
        bookingId,
        paymentStatus,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (err.code === '23505') return res.status(409).json({ error: 'A payment already exists for this booking.' });
      throw err;
    } finally {
      client.release();
    }
  })
);

// Admin: change payment status (Pending / Paid / Failed). Marking Paid confirms the booking.
router.put(
  '/api/payments/:id/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    const status = (req.body || {}).status;
    if (!id) return res.status(400).json({ error: 'Invalid payment id.' });
    if (!PAYMENT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('UPDATE payments SET status = $1 WHERE id = $2 RETURNING id, booking_id, status', [status, id]);
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Payment not found.' });
      }
      if (status === 'Paid') {
        await client.query("UPDATE bookings SET status = 'Confirmed' WHERE id = $1 AND status <> 'Cancelled'", [rows[0].booking_id]);
      }
      await client.query('COMMIT');
      res.json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (err.code === '23505') {
        return res.status(409).json({ error: 'This booking already has another active payment.' });
      }
      throw err;
    } finally {
      client.release();
    }
  })
);

module.exports = router;
