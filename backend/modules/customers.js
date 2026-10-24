// customers.js
const express = require('express');
const pool = require('../config/db');
const { renderAdminTablePage } = require('../templates/adminTable');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { raw, code } = require('../utils/format');

const router = express.Router();

router.get(
  '/admin/customers',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone, COUNT(b.id)::int AS booking_count
       FROM customers c LEFT JOIN bookings b ON b.customer_id = c.id
       GROUP BY c.id ORDER BY c.created_at DESC`
    );

    const tableRows = rows.map((c) => ({
      id: c.id,
      customerId: code('CUS', c.id),
      name: c.name,
      email: c.email,
      phone: c.phone,
      bookings: c.booking_count,
      status: raw('<span class="status confirmed">Active</span>'),
    }));

    res.send(
      renderAdminTablePage({
        req,
        title: 'Customers',
        eyebrow: 'ADMIN PANEL',
        breadcrumb: 'Dashboard / Customers',
        activeKey: 'customers',
        heading: 'All Customers',
        subheading: 'CUSTOMER MANAGEMENT',
        addButton: null,
        columns: [
          { key: 'customerId', label: 'Customer ID' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'status', label: 'Status' },
        ],
        rows: tableRows,
        emptyMessage: 'No customers yet.',
        tableId: 'customerTable',
      })
    );
  })
);

module.exports = router;
