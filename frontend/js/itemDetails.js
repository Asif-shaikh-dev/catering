// itemDetails.js

(function () {
  const info = document.querySelector('.item-details-info');
  if (!info) return;

  const price = Number(info.dataset.price);
  const id = info.dataset.id;
  const quantityEl = document.getElementById('quantity');
  const totalEl = document.getElementById('totalPrice');
  const orderBtn = document.getElementById('orderBtn');

  let qty = 1;
  function render() {
    quantityEl.textContent = qty;
    totalEl.textContent = formatINR(price * qty);
    orderBtn.href = '/order?item=' + encodeURIComponent(id) + '&qty=' + qty;
  }

  document.getElementById('plusBtn').addEventListener('click', function () {
    if (qty < 20) qty += 1;
    render();
  });
  document.getElementById('minusBtn').addEventListener('click', function () {
    if (qty > 1) qty -= 1;
    render();
  });
})();