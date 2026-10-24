// Quantity +/- on the public menu cards, and "Order Now" carries the dish into the booking form.
(function () {
  document.querySelectorAll('.menu-card').forEach(function (card) {
    const price = Number(card.dataset.price);
    const name = card.dataset.name;
    const quantityEl = card.querySelector('.quantity');
    const totalEl = card.querySelector('.item-total');
    const orderLink = card.querySelector('.order-btn');
    if (!price || !quantityEl || !totalEl) return;

    let qty = 1;
    function render() {
      quantityEl.textContent = qty;
      totalEl.textContent = 'Total: ' + formatINR(price * qty);
      if (orderLink) orderLink.href = '/booking?item=' + encodeURIComponent(name) + '&qty=' + qty;
    }

    card.querySelector('.plus').addEventListener('click', function () {
      if (qty < 999) qty += 1;
      render();
    });
    card.querySelector('.minus').addEventListener('click', function () {
      if (qty > 1) qty -= 1;
      render();
    });
  });
})();
