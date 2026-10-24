// layout.js
const { escapeHtml: esc } = require('../utils/format');

const NAV_LINKS = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/about', label: 'About', key: 'about' },
  { href: '/menu', label: 'Menu', key: 'menu' },
  { href: '/services', label: 'Services', key: 'services' },
  { href: '/packages', label: 'Packages', key: 'packages' },
  { href: '/contact', label: 'Contact', key: 'contact' },
];

const ADMIN_NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', key: 'dashboard' },
  { href: '/admin/bookings', label: 'Bookings', key: 'bookings' },
  { href: '/admin/customers', label: 'Customers', key: 'customers' },
  { href: '/admin/payments', label: 'Payments', key: 'payments' },
  { href: '/admin/menu', label: 'Menu', key: 'menu' },
  { href: '/admin/packages', label: 'Packages', key: 'packages' },
  { href: '/admin/services', label: 'Services', key: 'services' },
  { href: '/admin/messages', label: 'Messages', key: 'messages' },
];

function buildNav(links, activeKey) {
  return links
    .map(
      (link) =>
        `<li><a href="${link.href}"${link.key === activeKey ? ' class="active"' : ''}>${link.label}</a></li>`
    )
    .join('\n');
}

function header({ activeKey = '', isAdmin = false, auth = null } = {}) {
  const links = isAdmin ? ADMIN_NAV_LINKS : NAV_LINKS;
  const navHtml = buildNav(links, activeKey);

  let rightHtml;
  if (isAdmin) {
    rightHtml = `<a href="/api/admin/logout" class="btn">Logout</a>`;
  } else if (auth) {
    rightHtml = `
      <a href="/booking" class="btn">Book Now</a>
      <div class="auth-links">
        <a href="/my-bookings">${esc(auth.name)}</a>
        <a href="/api/auth/logout" class="btn">Logout</a>
      </div>`;
  } else {
    rightHtml = `
      <a href="/booking" class="btn">Book Now</a>
      <div class="auth-links">
        <a href="/login">Login</a>
        <a href="/signup" class="btn">Sign Up</a>
      </div>`;
  }

  return `
  <header>
    <nav class="navbar">
      <div class="logo"><h2>STARTER STATION<span>.</span></h2></div>
      <ul class="nav-links">${navHtml}</ul>
      ${rightHtml}
    </nav>
  </header>`;
}

function pageBanner({ eyebrow, title, breadcrumb }) {
  return `
  <section class="page-banner">
    <div>
      <p>${esc(eyebrow)}</p>
      <h1>${esc(title)}</h1>
      <span>${esc(breadcrumb)}</span>
    </div>
  </section>`;
}

function footer() {
  const year = new Date().getFullYear();
  const quickLinks = NAV_LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join('\n');

  return `
  <footer>
    <div class="footer-content">
      <div>
        <h2>STARTER STATION<span>.</span></h2>
        <p>Delicious food and professional catering for your memorable events.</p>
      </div>
      <div>
        <h3>Quick Links</h3>
        ${quickLinks}
      </div>
      <div>
        <h3>Contact</h3>
        <p>📞 +91 7020479686</p>
        <p>✉️ sadiqsayyed48@gmail.com</p>
      </div>
    </div>
    <div class="copyright">
      <p>© ${year} Catering Management System. All Rights Reserved.</p>
    </div>
  </footer>`;
}

// Pass `req` so the header can show the logged-in customer on EVERY page
// (before, only /my-bookings did, so the navbar said "Login" even when logged in).
function renderPage({ title, activeKey = '', isAdmin = false, req = null, auth = null, banner = null, body = '', scripts = [] }) {
  const session = req && req.session;
  const user = auth || (session && session.customerId ? { name: session.customerName } : null);
  const scriptTags = ['/js/common.js', ...scripts].map((src) => `<script src="${src}"></script>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} - Catering Management System</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/fixes.css">
</head>
<body>
${header({ activeKey, isAdmin, auth: user })}
${banner ? pageBanner(banner) : ''}
${body}
${footer()}
${scriptTags}
</body>
</html>`;
}

// Simple card page for "not found", "access denied", etc.
function renderMessagePage({ req, title, heading, message, linkHref = '/', linkLabel = 'Back to home' }) {
  const body = `
  <section class="auth-section">
    <div class="auth-container">
      <h2>${esc(heading)}</h2>
      <p>${esc(message)}</p>
      <a href="${esc(linkHref)}" class="btn">${esc(linkLabel)}</a>
    </div>
  </section>`;
  return renderPage({ title, req, body });
}

module.exports = { renderPage, renderMessagePage, header, footer, pageBanner, NAV_LINKS, ADMIN_NAV_LINKS };
