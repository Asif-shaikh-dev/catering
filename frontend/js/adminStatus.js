// Status dropdowns in the admin Bookings and Payments tables.
document.addEventListener('change', async function (event) {
  const select = event.target.closest('.status-select');
  if (!select) return;

  const result = await apiRequest(select.dataset.endpoint + '/' + select.dataset.id + '/status', 'PUT', { status: select.value });
  if (result.ok) {
    location.reload(); // a payment change can also confirm its booking, so refresh both columns
  } else {
    alert(result.data.error || 'Could not update the status.');
    select.value = select.dataset.current; // put the old value back
  }
});
