// Usage:  npm run seed      (safe to run again - it only adds what is missing)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../backend/config/db');

// [name, category, description, price, image file in frontend/images]
const MENU = [
  // Starters
  ['Paneer Tikka', 'Starter', 'Grilled paneer cubes marinated with yogurt and Indian spices.', 220, 'paneer-tikka.jfif'],
  ['Chicken Tikka', 'Starter', 'Juicy chicken pieces grilled with aromatic spices.', 280, 'chicken-tikka.jpg'],
  ['Veg Spring Roll', 'Starter', 'Crispy rolls filled with fresh vegetables and herbs.', 160, 'veg-spring-roll.jpg'],
  ['Hara Bhara Kebab', 'Starter', 'Spinach and green pea kebabs, pan-seared until crisp.', 180, 'Hara-Bhara-Kebab.jpg'],
  ['Chicken Seekh Kebab', 'Starter', 'Minced chicken skewers grilled in the tandoor.', 300, 'chicken-seekh-kebab.jpg'],
  ['Malai Seekh', 'Starter', 'Creamy, mildly spiced seekh kebabs.', 290, 'malai-seekh.jpg'],
  ['Tandoori Chicken', 'Starter', 'Classic chicken marinated overnight and roasted in the tandoor.', 320, 'Tandoori-Chicken.jpg'],
  ['Fish Fry', 'Starter', 'Crispy spiced fish fillets.', 340, 'fish-fry.jpg'],
  ['Crispy Corn', 'Starter', 'Golden fried sweet corn tossed with spices.', 150, 'crispy-corn.jpg'],
  ['Cheese Balls', 'Starter', 'Crunchy outside, melting cheese inside.', 170, 'cheese-balls.jpg'],
  ['Chicken Wings', 'Starter', 'Spicy glazed chicken wings.', 260, 'chicken-wings.jpg'],
  ['Veg Cutlet', 'Starter', 'Crumb-coated vegetable cutlets.', 140, 'veg-cutlet.jpg'],
  // Main course
  ['Chicken Biryani', 'Main Course', 'Aromatic basmati rice cooked with tender chicken and spices.', 250, 'Chicken-Biryani.jpg'],
  ['Veg Biryani', 'Main Course', 'Fragrant rice cooked with fresh vegetables and spices.', 200, 'Veg-Biryani.jpg'],
  ['Mutton Biryani', 'Main Course', 'Slow-cooked mutton layered with saffron rice.', 350, 'Mutton-Biryani.jpg'],
  ['Chicken Seekh Biryani', 'Main Course', 'Biryani topped with smoky seekh kebabs.', 300, 'chicken-seekh-biryani.jpg'],
  ['Butter Chicken', 'Main Course', 'Chicken cooked in a creamy tomato and butter gravy.', 280, 'butter-chicken.jpg'],
  ['Chicken Korma', 'Main Course', 'Chicken in a rich, mildly spiced cashew gravy.', 270, 'Chicken-Korma.jpg'],
  ['Paneer Butter Masala', 'Main Course', 'Paneer in a buttery tomato gravy.', 240, 'Paneer-Butter-Masala.jpg'],
  ['Malai Kofta', 'Main Course', 'Soft paneer-potato dumplings in a creamy gravy.', 230, 'Malai-Kofta.jpg'],
  ['Dal Makhani', 'Main Course', 'Black lentils simmered overnight with butter and cream.', 190, 'Dal-Makhani.jpg'],
  ['Rajma Chawal', 'Main Course', 'Kidney bean curry served with steamed rice.', 170, 'Rajma-Chawal.jpg'],
  ['Chole Bhature', 'Main Course', 'Spiced chickpeas with fluffy fried bread.', 160, 'Chole-Bhature.jpg'],
  ['Veg Fried Rice', 'Main Course', 'Wok-tossed rice with crunchy vegetables.', 180, 'Veg-Fried-Rice.jpg'],
  ['Chicken Noodles', 'Main Course', 'Stir-fried noodles with chicken and vegetables.', 210, 'Chicken-Noodles.jpg'],
  // Desserts
  ['Gulab Jamun', 'Dessert', 'Soft sweet dumplings served with delicious sugar syrup.', 120, 'gulab-jamun.jpg'],
  ['Rasmalai', 'Dessert', 'Soft cheese dumplings soaked in creamy flavored milk.', 150, 'Rasmalai.jpg'],
  ['Ice Cream', 'Dessert', 'Chilled creamy ice cream available in different flavors.', 100, 'Ice-Cream.jpg'],
  ['Gajar Halwa', 'Dessert', 'Slow-cooked carrot pudding with ghee and dry fruits.', 130, 'Gajar-Halwa.jpg'],
  ['Moong Dal Halwa', 'Dessert', 'Rich lentil halwa roasted in ghee.', 140, 'Moong-Dal-Halwa.jpg'],
  ['Jalebi', 'Dessert', 'Crispy saffron spirals soaked in syrup.', 90, 'Jalebi.jpg'],
  ['Kheer', 'Dessert', 'Creamy rice pudding with cardamom and nuts.', 110, 'Kheer.jpg'],
  ['Rasgulla', 'Dessert', 'Spongy cottage-cheese balls in light syrup.', 100, 'Rasgulla.jpg'],
  ['Shahi Tukda', 'Dessert', 'Fried bread soaked in saffron rabri.', 140, 'Shahi-Tukda.jpg'],
  ['Mango Mousse', 'Dessert', 'Light and airy mango mousse.', 150, 'Mango-Mousse.jpg'],
  ['Fruit Custard', 'Dessert', 'Chilled custard with seasonal fruits.', 120, 'Fruit-Custard.jpg'],
  ['Chocolate Brownie', 'Dessert', 'Warm fudgy chocolate brownie.', 130, 'Chocolate-Brownie.jpg'],
  // Drinks (no drink photos in /images yet, so the generic catering photo is used)
  ['Fresh Juice', 'Drinks', 'Seasonal fresh fruit juice.', 120, 'catering.jpg'],
];

const PACKAGES = [
  ['Basic Package', 'Basic', 499, 50],
  ['Standard Package', 'Standard', 799, 100],
  ['Premium Package', 'Premium', 1199, 150],
];

const SERVICES = [
  ['Wedding Catering', 'Complete wedding catering service.', 25000],
  ['Birthday Catering', 'Catering for birthday celebrations.', 10000],
  ['Corporate Events', 'Professional office event catering.', 15000],
  ['Outdoor Catering', 'Complete outdoor event catering.', 18000],
];

async function seed() {
  const client = await pool.connect();

  try {
    // ---- admin (credentials come from .env, not hard-coded) ----
    const { rows: adminCount } = await client.query('SELECT COUNT(*)::int AS count FROM admins');
    if (adminCount[0].count === 0) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'admin123';
      const hash = await bcrypt.hash(password, 10);
      await client.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [username, hash]);
      console.log(`✓ Admin created -> username: ${username}`);
      if (!process.env.ADMIN_PASSWORD) {
        console.log('  ⚠ Using the default password "admin123". Set ADMIN_PASSWORD in .env before going live.');
      }
    } else {
      console.log('- Admin already exists, skipping.');
    }

    // ---- menu: add every dish that is missing (matched by name) ----
    let added = 0;
    for (const [name, category, description, price, image] of MENU) {
      const res = await client.query(
        `INSERT INTO menu_items (name, category, description, price, image)
         SELECT $1::varchar, $2::varchar, $3::text, $4::numeric, $5::varchar
         WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = $1::varchar)`,
        [name, category, description, price, image]
      );
      added += res.rowCount;
    }
    // Old seed pointed to paneer-tikka.jpg but the real file is paneer-tikka.jfif -> broken image
    await client.query("UPDATE menu_items SET image = 'paneer-tikka.jfif' WHERE name = 'Paneer Tikka' AND image = 'paneer-tikka.jpg'");
    console.log(added ? `✓ ${added} menu items added` : '- Menu items already exist, skipping.');

    // ---- packages ----
    const { rows: pkgCount } = await client.query('SELECT COUNT(*)::int AS count FROM packages');
    if (pkgCount[0].count === 0) {
      for (const [name, category, price, guests] of PACKAGES) {
        await client.query('INSERT INTO packages (name, category, price_per_person, max_guests) VALUES ($1,$2,$3,$4)', [name, category, price, guests]);
      }
      console.log(`✓ ${PACKAGES.length} sample packages created`);
    } else {
      console.log('- Packages already exist, skipping.');
    }

    // ---- services ----
    const { rows: svcCount } = await client.query('SELECT COUNT(*)::int AS count FROM services');
    if (svcCount[0].count === 0) {
      for (const [name, description, price] of SERVICES) {
        await client.query('INSERT INTO services (name, description, price) VALUES ($1,$2,$3)', [name, description, price]);
      }
      console.log(`✓ ${SERVICES.length} sample services created`);
    } else {
      console.log('- Services already exist, skipping.');
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
