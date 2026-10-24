(function () {
  const info = document.querySelector('.item-details-info');
  if (!info) return;

  const price = Number(info.dataset.price);
  const name = info.dataset.name;
  const quantityEl = document.getElementById('quantity');
  const totalEl = document.getElementById('totalPrice');
  const orderBtn = document.getElementById('orderBtn');

  let qty = 1;
  function render() {
    quantityEl.textContent = qty;
    totalEl.textContent = formatINR(price * qty);
    orderBtn.href = '/booking?item=' + encodeURIComponent(name) + '&qty=' + qty;
  }

  document.getElementById('plusBtn').addEventListener('click', function () {
    if (qty < 999) qty += 1;
    render();
  });
  document.getElementById('minusBtn').addEventListener('click', function () {
    if (qty > 1) qty -= 1;
    render();
  });
})();
