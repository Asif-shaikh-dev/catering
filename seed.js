require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../backend/config/db');

async function seed() {
  const client = await pool.connect();

  try {
    const { rows: adminCount } = await client.query('SELECT COUNT(*)::int AS count FROM admins');
    if (adminCount[0].count === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await client.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', ['admin', hash]);
      console.log('✓ Default admin created -> username: admin / password: admin123');
    } else {
      console.log('- Admins already exist, skipping.');
    }

    const { rows: menuCount } = await client.query('SELECT COUNT(*)::int AS count FROM menu_items');
    if (menuCount[0].count === 0) {
      const items = [
        ['Paneer Tikka', 'Starter', 'Grilled paneer cubes marinated with yogurt and Indian spices.', 220, 'paneer-tikka.jpg'],
        ['Chicken Tikka', 'Starter', 'Juicy chicken pieces grilled with aromatic spices.', 280, 'chicken-tikka.jpg'],
        ['Veg Spring Roll', 'Starter', 'Crispy rolls filled with fresh vegetables and herbs.', 160, 'veg-spring-roll.jpg'],
        ['Chicken Biryani', 'Main Course', 'Aromatic basmati rice cooked with tender chicken and spices.', 250, 'Chicken-Biryani.jpg'],
        ['Veg Biryani', 'Main Course', 'Fragrant rice cooked with fresh vegetables and spices.', 200, 'Veg-Biryani.jpg'],
        ['Butter Chicken', 'Main Course', 'Chicken cooked in a creamy tomato and butter gravy.', 280, 'butter-chicken.jpg'],
        ['Gulab Jamun', 'Dessert', 'Soft sweet dumplings served with delicious sugar syrup.', 120, 'gulab-jamun.jpg'],
        ['Rasmalai', 'Dessert', 'Soft cheese dumplings soaked in creamy flavored milk.', 150, 'Rasmalai.jpg'],
        ['Ice Cream', 'Dessert', 'Chilled creamy ice cream available in different flavors.', 100, 'Ice-Cream.jpg'],
        ['Fresh Juice', 'Drinks', 'Seasonal fresh fruit juice.', 120, 'catering.jpg'],
      ];
      for (const [name, category, description, price, image] of items) {
        await client.query(
          'INSERT INTO menu_items (name, category, description, price, image) VALUES ($1,$2,$3,$4,$5)',
          [name, category, description, price, image]
        );
      }
      console.log(`✓ ${items.length} sample menu items created`);
    } else {
      console.log('- Menu items already exist, skipping.');
    }

    const { rows: pkgCount } = await client.query('SELECT COUNT(*)::int AS count FROM packages');
    if (pkgCount[0].count === 0) {
      const packages = [
        ['Basic Package', 'Basic', 499, 50],
        ['Standard Package', 'Standard', 799, 100],
        ['Premium Package', 'Premium', 1199, 150],
      ];
      for (const [name, category, price, guests] of packages) {
        await client.query(
          'INSERT INTO packages (name, category, price_per_person, max_guests) VALUES ($1,$2,$3,$4)',
          [name, category, price, guests]
        );
      }
      console.log(`✓ ${packages.length} sample packages created`);
    } else {
      console.log('- Packages already exist, skipping.');
    }

    const { rows: svcCount } = await client.query('SELECT COUNT(*)::int AS count FROM services');
    if (svcCount[0].count === 0) {
      const services = [
        ['Wedding Catering', 'Complete wedding catering service.', 25000],
        ['Birthday Catering', 'Catering for birthday celebrations.', 10000],
        ['Corporate Events', 'Professional office event catering.', 15000],
        ['Outdoor Catering', 'Complete outdoor event catering.', 18000],
      ];
      for (const [name, description, price] of services) {
        await client.query('INSERT INTO services (name, description, price) VALUES ($1,$2,$3)', [name, description, price]);
      }
      console.log(`✓ ${services.length} sample services created`);
    } else {
      console.log('- Services already exist, skipping.');
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();