// signup.js

(function () {
  const form = document.getElementById('signupForm');
  if (!form) return;
  const message = document.getElementById('signupMessage');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) return setMessage(message, 'Passwords do not match.', false);
    if (password.length < 8) return setMessage(message, 'Password must be at least 8 characters.', false);

    const button = form.querySelector('button[type="submit"]');
    setBusy(button, true);

    const result = await apiRequest('/api/auth/signup', 'POST', {
      name: document.getElementById('signupName').value.trim(),
      email: document.getElementById('signupEmail').value.trim(),
      phone: document.getElementById('signupPhone').value.trim(),
      password: password,
      confirmPassword: confirmPassword,
    });

    if (result.ok) {
      setMessage(message, 'Account created successfully! Redirecting...', true);
      location.href = safeNext() || '/';
    } else {
      setMessage(message, result.data.error || 'Sign up failed.', false);
      setBusy(button, false);
    }
  });
})();
