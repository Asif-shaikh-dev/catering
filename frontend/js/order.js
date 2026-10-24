// order.js - single dish order page (quantity, delivery details, payment)

(function () {
    const form = document.getElementById('orderForm');
    const summary = document.getElementById('orderSummary');
    if (!form || !summary) return;
  
    const price = Number(summary.dataset.price);
    const maxQty = Number(summary.dataset.max) || 20;
    let qty = Math.min(Math.max(parseInt(summary.dataset.qty, 10) || 1, 1), maxQty);
  
    const qtyEl = document.getElementById('orderQty');
    const totalEl = document.getElementById('orderTotal');
    const submitBtn = document.getElementById('orderSubmit');
    const errorBox = document.getElementById('orderError');
    const successBox = document.getElementById('orderSuccess');
    const addressGroup = document.getElementById('addressGroup');
    const addressInput = document.getElementById('orderAddress');
    const upiGroup = document.getElementById('upiGroup');
    const upiInput = document.getElementById('orderUpi');
  
    function selected(name) {
      return form.querySelector('input[name="' + name + '"]:checked').value;
    }
  
    function render() {
      const total = formatINR(price * qty);
      qtyEl.textContent = qty;
      totalEl.textContent = total;
      submitBtn.textContent = selected('payment') === 'Cash' ? 'Place Order - ' + total : 'Pay ' + total;
    }
  
    // Address only for delivery, UPI box only for UPI
    function syncForm() {
      const delivery = selected('orderType') === 'Delivery';
      addressGroup.style.display = delivery ? '' : 'none';
      addressInput.required = delivery;
  
      const isUpi = selected('payment') === 'UPI';
      upiGroup.style.display = isUpi ? '' : 'none';
      upiInput.required = isUpi;
  
      render();
    }
  
    document.getElementById('orderPlus').addEventListener('click', function () {
      if (qty < maxQty) qty += 1;
      render();
    });
    document.getElementById('orderMinus').addEventListener('click', function () {
      if (qty > 1) qty -= 1;
      render();
    });
    form.querySelectorAll('input[name="orderType"], input[name="payment"]').forEach(function (r) {
      r.addEventListener('change', syncForm);
    });
    syncForm();
  
    // Pre-fill the logged-in customer's details (guests get a 401, which is ignored)
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (me) {
        if (!me) return;
        const fill = function (id, value) {
          const el = document.getElementById(id);
          if (el && !el.value) el.value = value || '';
        };
        fill('orderName', me.name);
        fill('orderEmail', me.email);
        fill('orderPhone', me.phone);
      })
      .catch(function () {});
  
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      setMessage(errorBox, '', false);
  
      setBusy(submitBtn, true);
  
      const result = await apiRequest('/api/orders', 'POST', {
        itemId: form.dataset.itemId,
        quantity: qty,
        name: document.getElementById('orderName').value.trim(),
        phone: document.getElementById('orderPhone').value.trim(),
        email: document.getElementById('orderEmail').value.trim(),
        orderType: selected('orderType'),
        address: addressInput.value.trim(),
        notes: document.getElementById('orderNotes').value.trim(),
        method: selected('payment'),
        upi: upiInput.value.trim(),
      });
  
      if (result.ok) {
        successBox.textContent = '🎉 ' + result.data.message + ' Redirecting...';
        successBox.style.display = 'block';
        setTimeout(function () {
          location.href = '/order-confirmation/' + result.data.id;
        }, 1200);
      } else {
        setMessage(errorBox, result.data.error || 'Could not place the order.', false);
        setBusy(submitBtn, false);
      }
    });
  })();