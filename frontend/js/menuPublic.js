// menuPublic.js

// Quantity +/- on the public menu cards, and "Order Now" opens the single-dish order page.
(function () {
  document.querySelectorAll('.menu-card').forEach(function (card) {
    const price = Number(card.dataset.price);
    const id = card.dataset.id;
    const quantityEl = card.querySelector('.quantity');
    const totalEl = card.querySelector('.item-total');
    const orderLink = card.querySelector('.order-btn');
    if (!price || !quantityEl || !totalEl) return;

    let qty = 1;
    function render() {
      quantityEl.textContent = qty;
      totalEl.textContent = 'Total: ' + formatINR(price * qty);
      if (orderLink) orderLink.href = '/order?item=' + encodeURIComponent(id) + '&qty=' + qty;
    }

    card.querySelector('.plus').addEventListener('click', function () {
      if (qty < 20) qty += 1;
      render();
    });
    card.querySelector('.minus').addEventListener('click', function () {
      if (qty > 1) qty -= 1;
      render();
    });
  });
})();