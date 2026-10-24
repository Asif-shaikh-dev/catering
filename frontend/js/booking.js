// booking.js  (event bookings only - single dish orders use /order)

(function () {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  const errorBox = document.getElementById('bookingError');
  const successBox = document.getElementById('successMessage');
  const params = new URLSearchParams(location.search);

  // Pre-select a package when coming from a package card (?package=2)
  const wantedPackage = params.get('package');
  if (wantedPackage) {
    const select = document.getElementById('package');
    if ([...select.options].some((o) => o.value === wantedPackage)) select.value = wantedPackage;
  }

  // Pre-fill the logged-in customer's details (does nothing for guests: the API answers 401)
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((me) => {
      if (!me) return;
      const fill = (id, value) => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = value || '';
      };
      fill('name', me.name);
      fill('email', me.email);
      fill('phone', me.phone);
    })
    .catch(() => {});

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    setMessage(errorBox, '', false);

    const packageSelect = document.getElementById('package');
    const guests = parseInt(document.getElementById('guests').value, 10);
    const maxGuests = parseInt(packageSelect.selectedOptions[0] && packageSelect.selectedOptions[0].dataset.max, 10);

    if (!(guests >= 1)) return setMessage(errorBox, 'Number of guests must be 1 or more.', false);
    if (maxGuests && guests > maxGuests) {
      return setMessage(errorBox, 'This package supports up to ' + maxGuests + ' guests. Choose a bigger package or fewer guests.', false);
    }

    const button = form.querySelector('button[type="submit"]');
    setBusy(button, true);

    const result = await apiRequest('/api/bookings', 'POST', {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      event: document.getElementById('event').value,
      date: document.getElementById('date').value,
      guests: guests,
      package: packageSelect.value,
      message: document.getElementById('message').value.trim(),
    });

    if (result.ok) {
      successBox.style.display = 'block';
      setTimeout(function () {
        location.href = '/payment/' + result.data.id;
      }, 1000);
    } else {
      setMessage(errorBox, result.data.error || 'Could not create the booking.', false);
      setBusy(button, false);
    }
  });
})();