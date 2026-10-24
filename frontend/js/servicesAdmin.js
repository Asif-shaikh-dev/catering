// servicesAdmin.js

initAdminCrud({
  tableId: 'serviceTable',
  addButtonId: 'addServiceBtn',
  endpoint: '/api/services',
  noun: 'service',
  editClass: 'edit-service',
  fields: [
    { key: 'name', label: 'Service name:', required: true },
    { key: 'description', label: 'Service description:', required: true },
    { key: 'price', label: 'Starting price in ₹:', required: true },
    { key: 'status', label: 'Status (Available / Unavailable):', createDefault: 'Available', required: true },
  ],
});
