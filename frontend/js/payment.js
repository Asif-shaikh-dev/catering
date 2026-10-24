(function () {
  const form = document.getElementById('paymentForm');
  if (!form) return;

  const errorBox = document.getElementById('paymentError');
  const successBox = document.getElementById('paymentSuccess');
  const upiGroup = document.getElementById('upiGroup');
  const upiInput = document.getElementById('upi');

  function selectedMethod() {
    return form.querySelector('input[name="payment"]:checked').value;
  }

  // The UPI ID box only makes sense for UPI
  function syncMethod() {
    const isUpi = selectedMethod() === 'UPI';
    upiGroup.style.display = isUpi ? '' : 'none';
    upiInput.required = isUpi;
  }
  form.querySelectorAll('input[name="payment"]').forEach((r) => r.addEventListener('change', syncMethod));
  syncMethod();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    setMessage(errorBox, '', false);

    const button = form.querySelector('button[type="submit"]');
    setBusy(button, true);

    // Only the booking id + method are sent. The amount is calculated by the server.
    const bookingId = form.dataset.bookingId;
    const result = await apiRequest('/api/payments', 'POST', {
      bookingId: bookingId,
      method: selectedMethod(),
      upi: upiInput.value.trim(),
      payerName: document.getElementById('payerName').value.trim(),
    });

    if (result.ok) {
      successBox.textContent = '🎉 ' + result.data.message + ' Redirecting...';
      successBox.style.display = 'block';
      setTimeout(function () {
        location.href = '/confirmation/' + bookingId;
      }, 1200);
    } else {
      setMessage(errorBox, result.data.error || 'Payment failed.', false);
      setBusy(button, false);
    }
  });
})();
