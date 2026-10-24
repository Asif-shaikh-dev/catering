(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const success = document.getElementById('contactSuccess');
  const errorBox = document.getElementById('contactError');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    success.style.display = 'none';
    setMessage(errorBox, '', false);

    const button = form.querySelector('button[type="submit"]');
    setBusy(button, true);

    const result = await apiRequest('/api/contact', 'POST', {
      name: document.getElementById('cName').value.trim(),
      email: document.getElementById('cEmail').value.trim(),
      phone: document.getElementById('cPhone').value.trim(),
      subject: document.getElementById('cSubject').value.trim(),
      message: document.getElementById('cMessage').value.trim(),
    });

    setBusy(button, false);
    if (result.ok) {
      success.style.display = 'block';
      form.reset();
    } else {
      setMessage(errorBox, result.data.error || 'Could not send your message.', false);
    }
  });
})();
