// packagesAdmin.js

initAdminCrud({
  tableId: 'packageTable',
  addButtonId: 'addPackageBtn',
  endpoint: '/api/packages',
  noun: 'package',
  editClass: 'edit-package',
  fields: [
    { key: 'name', label: 'Package name:', required: true },
    { key: 'category', label: 'Category (e.g. Basic / Standard / Premium):', required: true },
    { key: 'price', label: 'Price per person in ₹:', required: true },
    { key: 'guests', label: 'Maximum number of guests:', required: true },
    { key: 'status', label: 'Status (Available / Unavailable):', createDefault: 'Available', required: true },
  ],
});
