// adminTable.js
const { renderPage } = require('./layout');
const { escapeHtml: esc } = require('../utils/format');

// A cell value is escaped automatically. Wrap trusted HTML (badges, buttons) with raw().
function cellHtml(value) {
  if (value && typeof value === 'object' && '__html' in value) return value.__html;
  return esc(value);
}

// row._data = { name: 'x', price: 10 }  ->  data-name="x" data-price="10"  (used by the edit prompts)
function dataAttrs(data) {
  return Object.entries(data || {})
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('');
}

// <select> that lets the admin change a status (handled by /js/adminStatus.js)
function statusSelect(endpoint, id, current, options) {
  const opts = options.map((o) => `<option${o === current ? ' selected' : ''}>${esc(o)}</option>`).join('');
  return {
    __html: `<select class="status-select" data-endpoint="${esc(endpoint)}" data-id="${Number(id)}" data-current="${esc(current)}">${opts}</select>`,
  };
}

function renderAdminTablePage({
  req = null,
  title,
  eyebrow,
  breadcrumb,
  activeKey,
  heading,
  subheading,
  addButton, // { id, label } or null
  columns, // [{ key, label }]
  rows, // array of objects keyed like the columns (+ id, optional _data)
  emptyMessage = 'No records found.',
  tableId,
  scripts = [],
}) {
  const theadHtml = columns.map((c) => `<th>${esc(c.label)}</th>`).join('\n');

  const rowsHtml = rows.length
    ? rows
        .map((row) => {
          const cells = columns.map((c) => `<td>${cellHtml(row[c.key] ?? '')}</td>`).join('\n');
          return `<tr data-id="${esc(row.id)}"${dataAttrs(row._data)}>${cells}</tr>`;
        })
        .join('\n')
    : `<tr><td colspan="${columns.length}">${esc(emptyMessage)}</td></tr>`;

  const addButtonHtml = addButton ? `<button class="btn" id="${esc(addButton.id)}">+ ${esc(addButton.label)}</button>` : '';

  const body = `
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <p>${esc(subheading)}</p>
        <h2>${esc(heading)}</h2>
      </div>
      ${addButtonHtml}
    </div>

    <div class="booking-table-card">
      <div class="table-container">
        <table>
          <thead><tr>${theadHtml}</tr></thead>
          <tbody id="${esc(tableId)}">${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  </section>`;

  return renderPage({
    title,
    activeKey,
    isAdmin: true,
    req,
    banner: { eyebrow, title, breadcrumb },
    body,
    scripts,
  });
}

module.exports = { renderAdminTablePage, statusSelect };
