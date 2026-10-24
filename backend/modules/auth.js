// auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { renderPage } = require('../templates/layout');
const { requireCustomer } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const rateLimit = require('../utils/rateLimit');
const { regenerate } = require('../utils/session');
const { str, isEmail, isPhone } = require('../utils/validate');
const { escapeHtml: esc } = require('../utils/format');

const router = express.Router();

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many attempts. Try again in 15 minutes.' });

function authPageBody({ heading, subtext, fields, submitLabel, footerText, footerLinkHref, footerLinkLabel, formId, messageId }) {
  const fieldsHtml = fields
    .map(
      (f) => `
      <div class="form-group">
        <label for="${f.id}">${esc(f.label)}</label>
        <input type="${f.type}" id="${f.id}" placeholder="${esc(f.placeholder)}" ${f.required ? 'required' : ''}>
      </div>`
    )
    .join('\n');

  return `
  <section class="auth-section">
    <div class="auth-container">
      <h2>${esc(heading)}</h2>
      <p>${esc(subtext)}</p>
      <form id="${formId}">
        ${fieldsHtml}
        <button type="submit" class="btn">${esc(submitLabel)}</button>
      </form>
      <p id="${messageId}" class="form-message"></p>
      <p class="auth-link">${esc(footerText)} <a href="${footerLinkHref}">${esc(footerLinkLabel)}</a></p>
    </div>
  </section>`;
}

router.get('/signup', (req, res) => {
  if (req.session.customerId) return res.redirect('/my-bookings');

  const body = authPageBody({
    heading: 'Create Your Account',
    subtext: 'Sign up to manage your catering bookings easily.',
    fields: [
      { id: 'signupName', label: 'Full Name', type: 'text', placeholder: 'Enter your full name', required: true },
      { id: 'signupEmail', label: 'Email', type: 'email', placeholder: 'Enter your email', required: true },
      { id: 'signupPhone', label: 'Phone Number', type: 'tel', placeholder: 'Enter your phone number', required: true },
      { id: 'signupPassword', label: 'Password', type: 'password', placeholder: 'Create a password (min 8 characters)', required: true },
      { id: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password', required: true },
    ],
    submitLabel: 'Create Account',
    footerText: 'Already have an account?',
    footerLinkHref: '/login',
    footerLinkLabel: 'Login',
    formId: 'signupForm',
    messageId: 'signupMessage',
  });

  res.send(
    renderPage({
      title: 'Sign Up',
      req,
      banner: { eyebrow: 'CREATE ACCOUNT', title: 'Sign Up', breadcrumb: 'Home / Sign Up' },
      body,
      scripts: ['/js/signup.js'],
    })
  );
});

router.get('/login', (req, res) => {
  if (req.session.customerId) return res.redirect('/my-bookings');

  const body = authPageBody({
    heading: 'Customer Login',
    subtext: 'Login to manage your catering bookings.',
    fields: [
      { id: 'loginEmail', label: 'Email', type: 'email', placeholder: 'Enter your email', required: true },
      { id: 'loginPassword', label: 'Password', type: 'password', placeholder: 'Enter your password', required: true },
    ],
    submitLabel: 'Login',
    footerText: "Don't have an account?",
    footerLinkHref: '/signup',
    footerLinkLabel: 'Sign Up',
    formId: 'loginForm',
    messageId: 'loginMessage',
  });

  res.send(
    renderPage({
      title: 'Login',
      req,
      banner: { eyebrow: 'WELCOME BACK', title: 'Login', breadcrumb: 'Home / Login' },
      body,
      scripts: ['/js/login.js'],
    })
  );
});

// ---------------- API ----------------

router.post(
  '/api/auth/signup',
  authLimiter,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const name = str(b.name);
    const email = str(b.email).toLowerCase(); // emails are case-insensitive: "A@x.com" and "a@x.com" are the same account
    const phone = str(b.phone);
    const password = typeof b.password === 'string' ? b.password : '';
    const confirmPassword = typeof b.confirmPassword === 'string' ? b.confirmPassword : '';

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Please enter a valid name.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: 'Password must be 8 to 72 characters.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let customer;
    try {
      const result = await pool.query(
        'INSERT INTO customers (name, email, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, name, email',
        [name, email, phone, passwordHash]
      );
      customer = result.rows[0];
    } catch (err) {
      // unique_violation: two signups with the same email at the same moment
      if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
      throw err;
    }

    await regenerate(req);
    req.session.customerId = customer.id;
    req.session.customerName = customer.name;

    res.status(201).json({ message: 'Account created successfully!', customer });
  })
);

router.post(
  '/api/auth/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const email = str(b.email).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';

    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    const customer = result.rows[0];

    const ok = await bcrypt.compare(password, customer ? customer.password_hash : DUMMY_HASH);
    if (!customer || !ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await regenerate(req);
    req.session.customerId = customer.id;
    req.session.customerName = customer.name;

    res.json({ message: 'Login successful!', customer: { id: customer.id, name: customer.name, email: customer.email } });
  })
);

router.get('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Used by the booking form to pre-fill the logged-in customer's details.
router.get(
  '/api/auth/me',
  requireCustomer,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT id, name, email, phone FROM customers WHERE id = $1', [req.session.customerId]);
    if (!rows.length) return res.status(401).json({ error: 'Not logged in.' });
    res.json(rows[0]);
  })
);

module.exports = router;
