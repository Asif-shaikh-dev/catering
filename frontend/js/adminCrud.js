// Shared add / edit / delete logic for the admin Menu, Packages and Services tables.
// Everything is saved to the database through the /api routes (the old version only changed the page).
function initAdminCrud(config) {
  const table = document.getElementById(config.tableId);
  const addButton = document.getElementById(config.addButtonId);
  if (!table) return;

  function showError(result) {
    alert(result.data.error || 'Something went wrong. Please try again.');
  }

  if (addButton) {
    addButton.addEventListener('click', async function () {
      const values = askFields(
        config.fields.map(function (f) {
          return Object.assign({}, f, { default: f.createDefault || '' });
        })
      );
      if (!values) return;
      const result = await apiRequest(config.endpoint, 'POST', values);
      if (result.ok) location.reload();
      else showError(result);
    });
  }

  table.addEventListener('click', async function (event) {
    const button = event.target.closest('button');
    const row = button && button.closest('tr');
    if (!button || !row || !row.dataset.id) return;
    const id = row.dataset.id;

    if (button.classList.contains('delete-btn')) {
      if (!confirm('Delete this ' + config.noun + '? This cannot be undone.')) return;
      const result = await apiRequest(config.endpoint + '/' + id, 'DELETE');
      if (result.ok) location.reload();
      else showError(result);
    }

    if (button.classList.contains(config.editClass)) {
      const values = askFields(
        config.fields.map(function (f) {
          return Object.assign({}, f, { default: row.dataset[f.key] || '' });
        })
      );
      if (!values) return;
      const result = await apiRequest(config.endpoint + '/' + id, 'PUT', values);
      if (result.ok) location.reload();
      else showError(result);
    }
  });
}
