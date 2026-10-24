// cards.js
const { escapeHtml: esc, formatMoney } = require('../utils/format');

function menuCardHtml(item) {
  const id = Number(item.id);
  const img = encodeURIComponent(item.image || 'catering.jpg');
  const url = `/item-details/${id}`;
  return `
  <div class="menu-card" data-id="${id}" data-price="${Number(item.price)}" data-name="${esc(item.name)}">
    <a href="${url}"><img src="/images/${img}" alt="${esc(item.name)}" loading="lazy"></a>
    <div class="menu-info">
      <h3><a href="${url}">${esc(item.name)}</a></h3>
      <p>${esc(item.description)}</p>
      <div class="menu-bottom">
        <span>${formatMoney(item.price)}</span>
        <div class="quantity-box">
          <button type="button" class="minus">-</button>
          <span class="quantity">1</span>
          <button type="button" class="plus">+</button>
        </div>
      </div>
      <div class="item-total">Total: ${formatMoney(item.price)}</div>
      <a href="/booking?item=${encodeURIComponent(item.name)}&amp;qty=1" class="order-btn">Order Now</a>
    </div>
  </div>`;
}

function packageCardHtml(pkg, featured = false) {
  const guests = pkg.max_guests || '—';
  return `
  <div class="package-card${featured ? ' featured' : ''}">
    ${featured ? '<div class="popular-label">MOST POPULAR</div>' : ''}
    <h3>${esc(pkg.name)}</h3>
    <div class="package-price">${formatMoney(pkg.price_per_person)} <span>/ Person</span></div>
    <p>Perfect catering package for up to ${esc(guests)} guests.</p>
    <ul>
      <li>✓ Category: ${esc(pkg.category)}</li>
      <li>✓ Up to ${esc(guests)} Guests</li>
      <li>✓ Professional Service</li>
    </ul>
    <a href="/booking?package=${Number(pkg.id)}" class="btn">Book Now</a>
  </div>`;
}

const SERVICE_ICONS = ['💍', '🎂', '🏢', '🎉', '🌳', '🍽️'];

function serviceCardHtml(service, index = 0) {
  return `
  <div class="service-card">
    <div class="icon">${SERVICE_ICONS[index % SERVICE_ICONS.length]}</div>
    <h3>${esc(service.name)}</h3>
    <p>${esc(service.description)}</p>
    <p class="service-price">Starting from ${formatMoney(service.price)}</p>
    <a href="/booking" class="btn">Book Service</a>
  </div>`;
}

module.exports = { menuCardHtml, packageCardHtml, serviceCardHtml };
