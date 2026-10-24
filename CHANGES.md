# What was fixed

## Setup (Windows / PowerShell)
1. Copy these files over your project (keep your own `node_modules`, `package-lock.json` and `frontend/images`).
2. **Delete `frontend/js/script.js`** – it is the old localStorage version, no page uses it any more.
3. Copy `.env.example` to `.env` and fill in your values (**DB_PASSWORD is now required – no fallback in code**).
4. Add these to the `"scripts"` section of your `package.json`:
   `"start": "node server.js", "db:init": "node database/init.js", "seed": "node database/seed.js"`
5. `npm run db:init` then `npm run seed` then `npm start`

Your `schema.sql` was not in what you sent, so `database/schema.sql` was rebuilt from what the code uses.
If you already have a database with different tables, compare it with this file (statuses used: bookings
Pending/Confirmed/Cancelled, payments Pending/Paid/Failed, menu/packages/services Available/Unavailable).

## Critical
- **Every form was broken**: the pages load /js/booking.js, login.js, signup.js, payment.js, contact.js,
  adminLogin.js, menuAdmin.js, ... but only script.js existed. All 14 scripts are now written and talk to the API.
- **Hard-coded DB password** (`asif6701`) removed from db.js – change that password, it was shared.
- **XSS**: names/descriptions were put into HTML unescaped everywhere (a booking name of `<script>` ran in the admin panel).
  All output is now escaped (`escapeHtml`, and table cells are escaped unless wrapped in `raw()`).
- **Payments trusted the browser**: `amount` came from the form. The server now calculates price x guests.
- **Anyone could open/pay any booking** via /payment/1, /confirmation/2 ... Now only the owner (logged-in customer,
  the browser session that made a guest booking, or an admin) can; others get a 404.
- **Double payments**: transaction + row lock + unique index – only one active payment per booking.
- **Server crashes**: async routes had no error handling (a DB hiccup or `/item-details/abc` killed the process
  in Node 15+). Every route is wrapped; a central error handler returns JSON for /api and a page otherwise.

## Logic bugs
- Navbar said "Login / Sign Up" on every page except /my-bookings even when logged in -> `req` is now passed to the layout.
- Confirmation page always said "Booking Confirmed!" (even unpaid/cancelled) and showed ₹0 when unpaid.
- Confirmation/my-bookings joined payments directly -> duplicated rows when a booking had 2 payments.
- Booking: no check for past dates, guests > package limit, unavailable/non-existent package, bad email/phone/event type.
- Cash payments were marked "Paid" immediately; now "Pending" until the admin marks them paid.
- Public /menu showed items marked Unavailable. Home "Popular" showed the 4 newest rows; now one per category.
- PUT routes overwrote missing fields with NULL; delete returned "Deleted." for rows that don't exist;
  deleting a package with bookings gave a 500 (now a clear message).
- Admin add/edit/delete only changed the page in the browser (nothing saved) – now saved through the API.
- Edit/prompts read numbers from "₹1,200" text; rows now carry clean `data-*` values.
- Prices like `220.00` (NUMERIC) printed raw; now formatted with `formatMoney`.
- Login/signup: emails are lowercased (no duplicate accounts by case), session id regenerated on login (session
  fixation), simple rate limiting, password min 8, admin-vs-unknown-user timing equalised, cookie is httpOnly + sameSite.
- Menu cards never linked to /item-details/:id (page was unreachable); added links, working +/- and "Order Now"
  now pre-fills the booking form.
- Seed used `paneer-tikka.jpg` but the file is `paneer-tikka.jfif` (broken image). Seed now uses your other
  ~30 images and can be re-run safely (adds only what is missing).

## New (small) things that were missing
- Admin **Messages** page – contact-form messages were stored but never visible.
- Admin can change **booking status** and **payment status** (dropdowns).
- `fixes.css`: `.hero` overlay had no positioned parent, no styles for the item-details page, active nav link,
  admin button colours, cancelled badges.

## Not changed / things to know
- The checkout is a **simulation** – no real payment gateway is called.
- Sessions use the in-memory store (logins vanish on restart). For production use `connect-pg-simple`.
- Logout is a GET link (kept as is); low risk with `sameSite=lax`.
- Reviews, stats ("500+ events") and the contact details on the pages are static text.
- Duplicate images you can delete: biryani.jpg, cheese-ball.jpg, paneer.jfif, seekh-kebab.jpg,
  Veg-Spring-Rolls.jpg, Vegetable-Fried-Rice.jpg, hero.jpg, home-catering.jpg (unused). Rename the two `.jfif`
  files to `.jpg` if you like (then update the image name in Admin > Menu).
