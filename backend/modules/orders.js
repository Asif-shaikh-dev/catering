// orders.js - single-dish food orders (completely separate from event bookings)
const express = require('express');
const pool = require('../config/db');
const { renderPage, renderMessagePage } = require('../templates/layout');
const { renderAdminTablePage, statusSelect } = require('../templates/adminTable');
const { requireAdmin, requireCustomer } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const rateLimit = require('../utils/rateLimit');
const { str, isEmail, isPhone } = require('../utils/validate');
const { escapeHtml: esc, raw, code, formatMoney, formatDate, toId, statusBadge } = require('../utils/format');

const router = express.Router();
const orderLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many orders. Please try again later.' });

const MAX_QTY = 20; // bigger quantities should go through the event booking form
const METHODS = ['UPI', 'Card', 'Cash'];
const ORDER_TYPES = ['Delivery', 'Pickup'];
const ORDER_STATUSES = ['Placed', 'Preparing', 'Delivered', 'Cancelled'];

// The table is created automatically the first time the server starts, so no manual SQL is needed.
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS food_orders (
  id             SERIAL PRIMARY KEY,
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  menu_item_id   INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name      VARCHAR(120)  NOT NULL,
  unit_price     NUMERIC(10,2) NOT NULL,
  quantity       INTEGER       NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  total_amount   NUMERIC(10,2) NOT NULL,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150),
  phone          VARCHAR(30)   NOT NULL,
  order_type     VARCHAR(20)   NOT NULL DEFAULT 'Delivery',
  address        TEXT,
  notes          TEXT,
  payment_method VARCHAR(20)   NOT NULL,
  payment_status VARCHAR(20)   NOT NULL DEFAULT 'Pending',
  status         VARCHAR(20)   NOT NULL DEFAULT 'Placed',
  created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_orders_customer ON food_orders (customer_id);
`;

const ready = pool.query(CREATE_SQL).catch((err) => {
  console.error('Could not create the food_orders table:', err.message);
});

// asyncHandler that first waits for the table to exist
const handle = (fn) =>
  asyncHandler(async (req, res, next) => {
    await ready;
    return fn(req, res, next);
  });

function clampQty(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) ? Math.min(Math.max(n, 1), MAX_QTY) : 1;
}

function lineTotal(price, qty) {
  return (Math.round(Number(price) * 100) * qty) / 100; // avoids 0.1 + 0.2 style rounding errors
}

// A guest can only open orders they placed in this browser session; customers can open their own.
function canAccessOrder(req, order) {
  const s = req.session || {};
  if (s.adminId) return true;
  if (order.customer_id && s.customerId === order.customer_id) return true;
  return Array.isArray(s.orderIds) && s.orderIds.includes(order.id);
}

async function findMenuItem(ref) {
  if (typeof ref !== 'string' || !ref.trim()) return null;
  const id = toId(ref);
  if (id) {
    const { rows } = await pool.query("SELECT * FROM menu_items WHERE id = $1 AND status = 'Available'", [id]);
    return rows[0] || null;
  }
  // old links used the dish name (?item=Paneer%20Tikka)
  const { rows } = await pool.query("SELECT * FROM menu_items WHERE LOWER(name) = LOWER($1) AND status = 'Available' LIMIT 1", [ref.trim()]);
  return rows[0] || null;
}

function orderNotFound(req, res) {
  return res.status(404).send(
    renderMessagePage({
      req,
      title: 'Order not found',
      heading: 'Order not found',
      message: 'We could not find this order, or it belongs to a different account.',
      linkHref: '/menu',
      linkLabel: 'Back to menu',
    })
  );
}

// ---------------- Pages ----------------

router.get(
  '/order',
  handle(async (req, res) => {
    const item = await findMenuItem(req.query.item);
    if (!item) {
      return res.status(404).send(
        renderMessagePage({
          req,
          title: 'Dish not found',
          heading: 'Dish not found',
          message: 'Please pick a dish from the menu to order. It may no longer be available.',
          linkHref: '/menu',
          linkLabel: 'Browse menu',
        })
      );
    }

    const qty = clampQty(req.query.qty);
    const total = lineTotal(item.price, qty);

    const body = `
  <section class="payment-section order-section">
    <div class="section-title"><p>QUICK ORDER</p><h2>Order Your Dish</h2></div>
    <div class="payment-container">
      <div class="payment-summary order-summary" id="orderSummary" data-price="${Number(item.price)}" data-max="${MAX_QTY}" data-qty="${qty}">
        <img class="order-item-image" src="/images/${encodeURIComponent(item.image || 'catering.jpg')}" alt="${esc(item.name)}">
        <h2>${esc(item.name)}</h2>
        <p class="order-description">${esc(item.description || 'Delicious food prepared fresh for you.')}</p>
        <div class="summary-item"><span>Price per plate</span><strong>${formatMoney(item.price)}</strong></div>
        <div class="summary-item">
          <span>Quantity (plates)</span>
          <div class="order-qty-box">
            <button type="button" id="orderMinus" aria-label="Decrease quantity">−</button>
            <strong id="orderQty">${qty}</strong>
            <button type="button" id="orderPlus" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="summary-total"><span>Total Amount</span><strong id="orderTotal">${formatMoney(total)}</strong></div>
        <p class="order-note">Ordering for a big event or more than ${MAX_QTY} plates? Please use the <a href="/booking">event booking form</a> instead.</p>
        <a href="/menu" class="back-btn">← Back to Menu</a>
      </div>

      <div class="payment-form">
        <h2>Delivery &amp; Payment</h2>
        <form id="orderForm" data-item-id="${item.id}">
          <div class="form-row">
            <div class="form-group">
              <label for="orderName">Full Name</label>
              <input type="text" id="orderName" placeholder="Enter your full name" required>
            </div>
            <div class="form-group">
              <label for="orderPhone">Phone Number</label>
              <input type="tel" id="orderPhone" placeholder="Enter your phone number" required>
            </div>
          </div>
          <div class="form-group">
            <label for="orderEmail">Email (optional)</label>
            <input type="email" id="orderEmail" placeholder="Enter your email">
          </div>

          <span class="order-label">Order Type</span>
          <div class="payment-methods">
            <label><input type="radio" name="orderType" value="Delivery" checked> Delivery</label>
            <label><input type="radio" name="orderType" value="Pickup"> Pickup</label>
          </div>
          <div class="form-group" id="addressGroup">
            <label for="orderAddress">Delivery Address</label>
            <textarea id="orderAddress" rows="3" maxlength="300" placeholder="House no, street, area, landmark"></textarea>
          </div>
          <div class="form-group">
            <label for="orderNotes">Note for the kitchen (optional)</label>
            <input type="text" id="orderNotes" maxlength="200" placeholder="e.g. less spicy">
          </div>

          <span class="order-label">Payment Method</span>
          <div class="payment-methods">
            <label><input type="radio" name="payment" value="UPI" checked> UPI</label>
            <label><input type="radio" name="payment" value="Card"> Card</label>
            <label><input type="radio" name="payment" value="Cash"> Cash on delivery / pickup</label>
          </div>
          <div class="form-group" id="upiGroup">
            <label for="orderUpi">UPI ID</label>
            <input type="text" id="orderUpi" placeholder="example@upi">
          </div>

          <button type="submit" class="btn" id="orderSubmit">Pay ${formatMoney(total)}</button>
        </form>
        <p id="orderError" class="form-message"></p>
        <p id="orderSuccess" style="display:none;">🎉 Order placed! Redirecting...</p>
      </div>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: `Order ${item.name}`,
        activeKey: 'menu',
        req,
        banner: { eyebrow: 'QUICK ORDER', title: 'Order Food', breadcrumb: 'Home / Menu / Order' },
        body,
        scripts: ['/js/order.js'],
      })
    );
  })
);

router.get(
  '/order-confirmation/:id',
  handle(async (req, res) => {
    const id = toId(req.params.id);
    const order = id ? (await pool.query('SELECT * FROM food_orders WHERE id = $1', [id])).rows[0] : null;
    if (!order || !canAccessOrder(req, order)) return orderNotFound(req, res);

    let icon = '✓';
    let heading = 'Order Placed!';
    let note = 'We have received your order and the kitchen will start on it soon.';
    let eyebrow = 'ORDER PLACED';
    if (order.status === 'Preparing') {
      icon = '👨‍🍳';
      heading = 'Preparing Your Food';
      note = 'Your food is being prepared right now.';
      eyebrow = 'ORDER IN PROGRESS';
    } else if (order.status === 'Delivered') {
      icon = '✓';
      heading = order.order_type === 'Pickup' ? 'Order Picked Up' : 'Order Delivered';
      note = 'Enjoy your meal!';
      eyebrow = 'ORDER COMPLETE';
    } else if (order.status === 'Cancelled') {
      icon = '✕';
      heading = 'Order Cancelled';
      note = 'This order has been cancelled.';
      eyebrow = 'ORDER CANCELLED';
    }

    const payNote =
      order.payment_method === 'Cash' && order.payment_status === 'Pending'
        ? ` Please pay in cash on ${order.order_type === 'Pickup' ? 'pickup' : 'delivery'}.`
        : order.payment_status === 'Paid'
          ? ' Your payment was received.'
          : '';

    const body = `
  <section class="confirmation-section">
    <div class="confirmation-card">
      <div class="success-icon">${icon}</div>
      <h1>${esc(heading)}</h1>
      <p class="confirmation-message">Thank you, ${esc(order.name)}. ${esc(note)}${esc(payNote)}</p>
      <div class="booking-details">
        <div class="detail-item"><span>Order ID</span><strong>${code('ORD', order.id)}</strong></div>
        <div class="detail-item"><span>Dish</span><strong>${esc(order.item_name)}</strong></div>
        <div class="detail-item"><span>Quantity</span><strong>${esc(order.quantity)}</strong></div>
        <div class="detail-item"><span>Total Amount</span><strong>${formatMoney(order.total_amount)}</strong></div>
        <div class="detail-item"><span>Order Type</span><strong>${esc(order.order_type)}</strong></div>
        <div class="detail-item"><span>${order.order_type === 'Delivery' ? 'Delivery Address' : 'Pickup'}</span><strong>${esc(order.order_type === 'Delivery' ? order.address || '-' : 'Collect from our kitchen')}</strong></div>
        <div class="detail-item"><span>Payment Method</span><strong>${esc(order.payment_method)}</strong></div>
        <div class="detail-item"><span>Payment Status</span><strong>${esc(order.payment_status)}</strong></div>
        <div class="detail-item"><span>Order Status</span><strong>${esc(order.status)}</strong></div>
      </div>
      <div class="confirmation-buttons">
        <a href="/menu" class="btn">Order More Food</a>
        ${req.session && req.session.customerId ? '<a href="/my-orders" class="btn">My Orders</a>' : ''}
        <a href="/" class="btn">Back To Home</a>
      </div>
    </div>
  </section>`;

    res.send(
      renderPage({
        title: heading,
        req,
        banner: { eyebrow, title: 'Order Confirmation', breadcrumb: 'Home / Order Confirmation' },
        body,
      })
    );
  })
);

router.get(
  '/my-orders',
  requireCustomer,
  handle(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM food_orders WHERE customer_id = $1 ORDER BY created_at DESC', [req.session.customerId]);

    const cardsHtml = rows.length
      ? rows
          .map(
            (o) => `
        <div class="booking-card">
          <div class="booking-header">
            <div>
              <h2>Order ${code('ORD', o.id)}</h2>
              <p>${esc(o.item_name)} × ${esc(o.quantity)}</p>
            </div>
            <span class="booking-status ${esc(o.status.toLowerCase())}">${esc(o.status)}</span>
          </div>
          <div class="booking-details-grid">
            <div><span>Placed On</span><strong>${formatDate(o.created_at)}</strong></div>
            <div><span>Order Type</span><strong>${esc(o.order_type)}</strong></div>
            <div><span>Total Amount</span><strong>${formatMoney(o.total_amount)}</strong></div>
            <div><span>Payment</span><strong>${esc(o.payment_method)} - ${esc(o.payment_status)}</strong></div>
          </div>
          <div class="booking-card-footer">
            <a href="/order-confirmation/${o.id}" class="btn">View Details</a>
            <a href="/menu" class="btn">Order Again</a>
          </div>
        </div>`
          )
          .join('\n')
      : `<p style="padding: 0 8%;">You have not ordered any food yet. <a href="/menu">Browse the menu →</a></p>`;

    const body = `
  <section class="my-bookings-section">
    <div class="section-title"><p>ORDER HISTORY</p><h2>Your Food Orders</h2></div>
    <div class="bookings-container">${cardsHtml}</div>
  </section>`;

    res.send(
      renderPage({
        title: 'My Orders',
        req,
        banner: { eyebrow: 'YOUR ORDERS', title: 'My Orders', breadcrumb: 'Home / My Orders' },
        body,
      })
    );
  })
);

router.get(
  '/admin/orders',
  requireAdmin,
  handle(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM food_orders ORDER BY created_at DESC');

    const tableRows = rows.map((o) => {
      const delivery =
        esc(o.order_type) +
        (o.order_type === 'Delivery' && o.address ? ': ' + esc(o.address) : '') +
        (o.notes ? '<br><em>Note: ' + esc(o.notes) + '</em>' : '');

      return {
        id: o.id,
        orderId: code('ORD', o.id),
        customer: o.name,
        phone: o.phone,
        item: o.item_name,
        qty: o.quantity,
        total: formatMoney(o.total_amount),
        delivery: raw(`<div class="message-cell">${delivery}</div>`),
        payment: raw(`${esc(o.payment_method)} ${statusBadge(o.payment_status)}`),
        date: formatDate(o.created_at),
        status: statusSelect('/api/orders', o.id, o.status, ORDER_STATUSES),
      };
    });

    res.send(
      renderAdminTablePage({
        req,
        title: 'Food Orders',
        eyebrow: 'ADMIN PANEL',
        breadcrumb: 'Dashboard / Orders',
        activeKey: 'orders',
        heading: 'All Food Orders',
        subheading: 'ORDER MANAGEMENT',
        addButton: null,
        columns: [
          { key: 'orderId', label: 'Order ID' },
          { key: 'customer', label: 'Customer' },
          { key: 'phone', label: 'Phone' },
          { key: 'item', label: 'Dish' },
          { key: 'qty', label: 'Qty' },
          { key: 'total', label: 'Total' },
          { key: 'delivery', label: 'Delivery / Notes' },
          { key: 'payment', label: 'Payment' },
          { key: 'date', label: 'Date' },
          { key: 'status', label: 'Status' },
        ],
        rows: tableRows,
        emptyMessage: 'No food orders yet.',
        tableId: 'ordersTable',
        scripts: ['/js/adminStatus.js'],
      })
    );
  })
);

// ---------------- API ----------------

// NOTE: simulated checkout (no real payment gateway), same as the booking payments.
// The price always comes from the database - never from the browser.
router.post(
  '/api/orders',
  orderLimiter,
  handle(async (req, res) => {
    const b = req.body || {};
    const itemId = toId(b.itemId);
    const quantity = Number(b.quantity);
    const name = str(b.name);
    const phone = str(b.phone);
    const email = str(b.email).toLowerCase();
    const orderType = str(b.orderType) || 'Delivery';
    const address = str(b.address);
    const notes = str(b.notes);
    const method = str(b.method);
    const upi = str(b.upi);

    if (!itemId) return res.status(400).json({ error: 'Please choose a dish from the menu.' });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
      return res.status(400).json({ error: `You can order 1 to ${MAX_QTY} plates here. For bigger orders please use the event booking form.` });
    }
    if (!name || name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Please enter a valid name.' });
    if (!phone || !isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
    if (email && !isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!ORDER_TYPES.includes(orderType)) return res.status(400).json({ error: 'Please choose Delivery or Pickup.' });
    if (orderType === 'Delivery' && address.length < 5) return res.status(400).json({ error: 'Please enter your delivery address.' });
    if (address.length > 300) return res.status(400).json({ error: 'Address is too long (max 300 characters).' });
    if (notes.length > 200) return res.status(400).json({ error: 'Note is too long (max 200 characters).' });
    if (!METHODS.includes(method)) return res.status(400).json({ error: 'Please choose a payment method.' });
    if (method === 'UPI' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
      return res.status(400).json({ error: 'Please enter a valid UPI ID (for example name@upi).' });
    }

    const { rows: itemRows } = await pool.query("SELECT id, name, price FROM menu_items WHERE id = $1 AND status = 'Available'", [itemId]);
    const item = itemRows[0];
    if (!item) return res.status(400).json({ error: 'This dish is no longer available.' });

    const unitPrice = Number(item.price);
    const total = lineTotal(unitPrice, quantity);
    if (!(total > 0)) return res.status(400).json({ error: 'This dish cannot be ordered online.' });

    // Online payments are "Paid" straight away; cash stays "Pending" until the food is delivered.
    const paymentStatus = method === 'Cash' ? 'Pending' : 'Paid';

    const { rows } = await pool.query(
      `INSERT INTO food_orders
         (customer_id, menu_item_id, item_name, unit_price, quantity, total_amount,
          name, email, phone, order_type, address, notes, payment_method, payment_status, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Placed')
       RETURNING id`,
      [
        req.session.customerId || null,
        item.id,
        item.name,
        unitPrice,
        quantity,
        total,
        name,
        email || null,
        phone,
        orderType,
        orderType === 'Delivery' ? address : null,
        notes || null,
        method,
        paymentStatus,
      ]
    );

    // Remember this order in the session so a guest can open the confirmation page
    const ids = Array.isArray(req.session.orderIds) ? req.session.orderIds : [];
    req.session.orderIds = [...ids, rows[0].id].slice(-20);

    res.status(201).json({
      id: rows[0].id,
      paymentStatus,
      message: paymentStatus === 'Paid' ? 'Payment successful! Your order is placed.' : 'Order placed! Please pay in cash on receiving your food.',
    });
  })
);

// Admin: change order status. Delivering a cash order marks its payment as Paid.
router.put(
  '/api/orders/:id/status',
  requireAdmin,
  handle(async (req, res) => {
    const id = toId(req.params.id);
    const status = (req.body || {}).status;
    if (!id) return res.status(400).json({ error: 'Invalid order id.' });
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const { rows } = await pool.query(
      `UPDATE food_orders
       SET status = $1::text,
           payment_status = CASE WHEN $1::text = 'Delivered' AND payment_status = 'Pending' THEN 'Paid' ELSE payment_status END
       WHERE id = $2
       RETURNING id, status, payment_status`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
    res.json(rows[0]);
  })
);

module.exports = router;