const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escape any user/database text before putting it into HTML.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESC[ch]);
}

// Mark a string as already-safe HTML (used for table cells such as badges / buttons).
function raw(html) {
  return { __html: String(html ?? '') };
}

// Display codes like #CMS001, #PAY007 built from the real serial id.
function code(prefix, id) {
  return `#${prefix}${String(id).padStart(3, '0')}`;
}

function formatMoney(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(date) {
  const d = new Date(date);
  if (!date || Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Local-time YYYY-MM-DD (toISOString() would use UTC and be off by a day around midnight in India)
function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isValidISODate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

// Safe positive-integer id from a URL param (returns null when invalid).
function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 2147483647 ? n : null;
}

// Booking total is always computed on the server: price per person x guests.
function calcTotal(booking) {
  return Number(booking.price_per_person || 0) * Number(booking.guests || 0);
}

function statusClass(status) {
  if (['Confirmed', 'Paid', 'Available'].includes(status)) return 'confirmed';
  if (['Cancelled', 'Failed', 'Unavailable'].includes(status)) return 'cancelled';
  return 'pending';
}

function statusBadge(status) {
  return `<span class="status ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

module.exports = {
  escapeHtml,
  raw,
  code,
  formatMoney,
  formatDate,
  todayISO,
  isValidISODate,
  toId,
  calcTotal,
  statusClass,
  statusBadge,
};
