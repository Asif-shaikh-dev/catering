// menuAdmin.js

initAdminCrud({
  tableId: 'menuTable',
  addButtonId: 'addMenuBtn',
  endpoint: '/api/menu',
  noun: 'menu item',
  editClass: 'edit-btn',
  fields: [
    { key: 'name', label: 'Item name:', required: true },
    { key: 'category', label: 'Category (Starter / Main Course / Dessert / Drinks):', required: true },
    { key: 'price', label: 'Price in ₹:', required: true },
    { key: 'description', label: 'Description (optional):' },
    { key: 'image', label: 'Image file name from the images folder (optional, e.g. paneer-tikka.jpg):' },
    { key: 'status', label: 'Status (Available / Unavailable):', createDefault: 'Available', required: true },
  ],
});
