// adminLogin.js
(function () {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;
  const message = document.getElementById('adminLoginMessage');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    setBusy(button, true);

    const result = await apiRequest('/api/admin/login', 'POST', {
      username: document.getElementById('adminUsername').value.trim(),
      password: document.getElementById('adminPassword').value,
    });

    if (result.ok) {
      setMessage(message, 'Login successful! Redirecting...', true);
      location.href = '/admin/dashboard';
    } else {
      setMessage(message, result.data.error || 'Login failed.', false);
      setBusy(button, false);
    }
  });
})();
