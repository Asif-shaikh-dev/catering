// login.js

(function () {
  const form = document.getElementById('loginForm');
  if (!form) return;
  const message = document.getElementById('loginMessage');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    setBusy(button, true);

    const result = await apiRequest('/api/auth/login', 'POST', {
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });

    if (result.ok) {
      setMessage(message, 'Login successful! Redirecting...', true);
      location.href = safeNext() || '/';
    } else {
      setMessage(message, result.data.error || 'Login failed.', false);
      setBusy(button, false);
    }
  });
})();
