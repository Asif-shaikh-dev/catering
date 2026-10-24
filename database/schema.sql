-- Catering Management System - PostgreSQL schema
-- Safe to run more than once (IF NOT EXISTS). Run with:  npm run db:init
-- (Your original schema.sql was not shared, so this one is rebuilt from what the code uses.)

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  category    VARCHAR(50)  NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image       VARCHAR(255),
  status      VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Unavailable')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packages (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  category         VARCHAR(50)  NOT NULL,
  price_per_person NUMERIC(10,2) NOT NULL CHECK (price_per_person > 0),
  max_guests       INTEGER NOT NULL CHECK (max_guests > 0),
  status           VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Unavailable')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  status      VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Unavailable')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  event_type  VARCHAR(30)  NOT NULL,
  event_date  DATE NOT NULL,
  guests      INTEGER NOT NULL CHECK (guests > 0),
  -- RESTRICT: a package that has bookings cannot be deleted (set it to Unavailable instead)
  package_id  INTEGER REFERENCES packages(id) ON DELETE RESTRICT,
  message     TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Confirmed','Cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id         SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount     NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  method     VARCHAR(20) NOT NULL CHECK (method IN ('UPI','Card','Cash')),
  status     VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Paid','Failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A booking can have only ONE active (Pending/Paid) payment, even if the user double-clicks "Pay".
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_per_booking
  ON payments (booking_id) WHERE status IN ('Pending','Paid');

CREATE TABLE IF NOT EXISTS contact_messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  phone      VARCHAR(20),
  subject    VARCHAR(150),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Run once against the same PostgreSQL database as your catering project.
-- Existing event bookings and booking payments are not changed.

CREATE TABLE IF NOT EXISTS food_orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_city VARCHAR(100) NOT NULL,
  delivery_pincode VARCHAR(12) NOT NULL,
  delivery_date DATE,
  delivery_instructions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled')),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name VARCHAR(120) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS food_orders_created_at_idx ON food_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS food_orders_customer_id_idx ON food_orders (customer_id);
CREATE INDEX IF NOT EXISTS food_order_items_order_id_idx ON food_order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package  ON bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking  ON payments(booking_id);
