// pages.js
const express = require('express');
const pool = require('../config/db');
const { renderPage } = require('../templates/layout');
const { menuCardHtml, packageCardHtml, serviceCardHtml } = require('../templates/cards');
const asyncHandler = require('../utils/asyncHandler');
const rateLimit = require('../utils/rateLimit');
const { str, isEmail, isPhone } = require('../utils/validate');
const { escapeHtml: esc } = require('../utils/format');

const router = express.Router();
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many messages. Please try again later.' });

const WHY_CHOOSE = [
  { title: 'Quality Food', text: 'Fresh ingredients and delicious recipes prepared by experienced chefs.' },
  { title: 'Professional Staff', text: 'Our trained staff provides friendly and professional service.' },
  { title: 'Affordable Pricing', text: 'Flexible packages and reasonable prices for every budget.' },
  { title: 'On-Time Service', text: 'We ensure timely preparation and smooth event management.' },
];

const REVIEWS = [
  { name: 'Aarav Sharma', event: 'Wedding Event', text: 'The food was absolutely delicious and the service was excellent. Everyone at our wedding loved it.' },
  { name: 'Priya Patil', event: 'Birthday Party', text: 'Amazing catering service! Everything was perfectly arranged and the food quality was outstanding.' },
  { name: 'Rahul Mehta', event: 'Corporate Event', text: 'Professional staff, tasty food and reasonable pricing. Highly recommended for any event.' },
];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [menuItems, packages, services] = await Promise.all([
      // One available dish per category (starter, main, dessert, drink) - the old query just showed the 4 newest rows
      pool.query(
        `SELECT * FROM (
           SELECT m.*, ROW_NUMBER() OVER (PARTITION BY category ORDER BY id) AS rn
           FROM menu_items m WHERE status = 'Available'
         ) t WHERE rn = 1 ORDER BY id LIMIT 4`
      ),
      pool.query('SELECT * FROM packages WHERE status = $1 ORDER BY price_per_person LIMIT 3', ['Available']),
      pool.query('SELECT * FROM services WHERE status = $1 ORDER BY id LIMIT 4', ['Available']),
    ]);

    const middleIndex = Math.floor(packages.rows.length / 2);

    const body = `
  <section class="hero">
    <div class="hero-content">
      <p>WELCOME TO OUR STARTER STATION</p>
      <h1>Delicious Food For Your Special Moments</h1>
      <p>We provide delicious food and professional catering services for weddings, parties, corporate events and all your special occasions.</p>
      <div class="hero-buttons">
        <a href="/booking" class="btn">Book Your Event</a>
        <a href="/menu" class="btn secondary-btn">Explore Menu</a>
      </div>
    </div>
  </section>

  <section class="services">
    <div class="section-title"><p>WHAT WE OFFER</p><h2>Our Catering Services</h2></div>
    <div class="service-container">${services.rows.map((s, i) => serviceCardHtml(s, i)).join('\n')}</div>
  </section>

  <section class="popular-menu">
    <div class="section-title"><p>OUR SPECIAL MENU</p><h2>Popular Food Items</h2></div>
    <div class="menu-container">${menuItems.rows.map(menuCardHtml).join('\n')}</div>
    <div class="menu-button"><a href="/menu" class="btn">View Full Menu</a></div>
  </section>

  <section class="packages">
    <div class="section-title"><p>CHOOSE YOUR PACKAGE</p><h2>Our Catering Packages</h2></div>
    <div class="package-container">${packages.rows.map((p, i) => packageCardHtml(p, i === middleIndex)).join('\n')}</div>
  </section>

  <section class="why-choose">
    <div class="why-content">
      <div class="why-image"><img src="/images/why-catering.jpg" alt="Professional Catering Service"></div>
      <div class="why-text">
        <div class="section-title"><p>WHY CHOOSE US</p><h2>We Make Your Event Special</h2></div>
        <p class="why-description">We provide high-quality food, professional service and complete catering solutions to make every event memorable and stress-free.</p>
        <div class="why-list">
          ${WHY_CHOOSE.map(
            (w) => `
          <div class="why-item">
            <div class="why-icon">✓</div>
            <div><h3>${w.title}</h3><p>${w.text}</p></div>
          </div>`
          ).join('\n')}
        </div>
        <a href="/booking" class="btn">Book Your Event</a>
      </div>
    </div>
  </section>

  <section class="reviews">
    <div class="section-title"><p>WHAT OUR CLIENTS SAY</p><h2>Customer Reviews</h2></div>
    <div class="review-container">
      ${REVIEWS.map(
        (r) => `
      <div class="review-card">
        <div class="stars">★★★★★</div>
        <p>${r.text}</p>
        <div class="customer">
          <div class="customer-avatar">${r.name.charAt(0)}</div>
          <div><h3>${r.name}</h3><span>${r.event}</span></div>
        </div>
      </div>`
      ).join('\n')}
    </div>
  </section>

  <section class="booking-cta">
    <div class="cta-content">
      <p>READY TO MAKE YOUR EVENT SPECIAL?</p>
      <h2>Let's Plan Your Perfect Event</h2>
      <p>From delicious food to professional service, we make your celebration truly memorable.</p>
      <a href="/booking" class="btn">Book Your Event</a>
    </div>
  </section>`;

    res.send(renderPage({ title: 'Home', activeKey: 'home', req, body }));
  })
);

router.get('/about', (req, res) => {
  const missions = [
    { icon: '🍽️', title: 'Quality Food', text: 'We use fresh ingredients and delicious recipes to provide high-quality food for every event.' },
    { icon: '👨‍🍳', title: 'Professional Service', text: 'Our experienced team provides reliable and professional catering service to every customer.' },
    { icon: '❤️', title: 'Customer Satisfaction', text: 'Customer satisfaction is our priority and we always work to make every event memorable.' },
  ];

  const stats = [
    { value: '500+', label: 'Events Completed' },
    { value: '1000+', label: 'Happy Customers' },
    { value: '50+', label: 'Food Items' },
    { value: '5+', label: 'Years Experience' },
  ];

  const body = `
  <section class="about-intro">
    <div class="about-image"><img src="/images/about-catering.jpg" alt="Catering Service"></div>
    <div class="about-text">
      <p class="about-subtitle">WHO WE ARE</p>
      <h2>We Make Every Event Special</h2>
      <p>Welcome to our Catering Management System. We provide delicious food and professional catering services for weddings, birthday parties, corporate events and other special occasions.</p>
      <p>Our goal is to make every event memorable by providing high-quality food, professional service and complete catering solutions according to our customers' needs.</p>
      <p>From menu selection to event management, we take care of every detail so you can enjoy your special occasion without any stress.</p>
      <a href="/booking" class="btn">Book Your Event</a>
    </div>
  </section>

  <section class="mission">
    <div class="section-title"><p>WHAT WE BELIEVE</p><h2>Our Mission &amp; Values</h2></div>
    <div class="mission-container">
      ${missions
        .map(
          (m) => `
      <div class="mission-card">
        <div class="mission-icon">${m.icon}</div>
        <h3>${m.title}</h3>
        <p>${m.text}</p>
      </div>`
        )
        .join('\n')}
    </div>
  </section>

  <section class="stats">
    <div class="stats-container">
      ${stats.map((s) => `<div class="stat-card"><h2>${s.value}</h2><p>${s.label}</p></div>`).join('\n')}
    </div>
  </section>

  <section class="about-cta">
    <div>
      <h2>Ready To Make Your Event Special?</h2>
      <p>Let us take care of the food and catering while you enjoy your memorable celebration.</p>
      <a href="/booking" class="btn">Book Your Event</a>
    </div>
  </section>`;

  res.send(
    renderPage({
      title: 'About Us',
      activeKey: 'about',
      req,
      banner: { eyebrow: 'ABOUT OUR CATERING', title: 'About Us', breadcrumb: 'Home / About' },
      body,
    })
  );
});

router.get('/contact', (req, res) => {
  const body = `
  <section class="contact-section">
    <div class="section-title"><p>CONTACT US</p><h2>We Would Love To Hear From You</h2></div>
    <div class="contact-container">
      <div class="contact-info">
        <h2>Get In Touch</h2>
        <p>Have a question or planning an event? Contact us and our team will be happy to help you.</p>
        <div class="contact-item"><div class="contact-icon">📍</div><div><h3>Address</h3><p>Pune, Maharashtra, India</p></div></div>
        <div class="contact-item"><div class="contact-icon">📞</div><div><h3>Phone</h3><p>+91 7020479686</p></div></div>
        <div class="contact-item"><div class="contact-icon">✉️</div><div><h3>Email</h3><p>sadiqsayyed48@gmail.com</p></div></div>
        <div class="contact-item"><div class="contact-icon">🕐</div><div><h3>Working Hours</h3><p>Monday - Sunday</p><p>24 Hours Service</p></div></div>
      </div>
      <div class="contact-form">
        <h2>Send Us A Message</h2>
        <form id="contactForm">
          <div class="form-row">
            <div class="form-group"><label for="cName">Your Name</label><input type="text" id="cName" placeholder="Enter your name" required></div>
            <div class="form-group"><label for="cEmail">Your Email</label><input type="email" id="cEmail" placeholder="Enter your email" required></div>
          </div>
          <div class="form-group"><label for="cPhone">Phone Number</label><input type="tel" id="cPhone" placeholder="Enter your phone number" required></div>
          <div class="form-group"><label for="cSubject">Subject</label><input type="text" id="cSubject" placeholder="Enter subject" required></div>
          <div class="form-group"><label for="cMessage">Message</label><textarea id="cMessage" rows="6" placeholder="Write your message here..." required></textarea></div>
          <button type="submit" class="btn">Send Message</button>
        </form>
        <p id="contactSuccess" style="display:none;">🎉 Message sent! We'll get back to you soon.</p>
        <p id="contactError" class="form-message"></p>
      </div>
    </div>
  </section>
  <section class="booking-cta">
    <div class="cta-content">
      <p>PLAN YOUR EVENT WITH US</p>
      <h2>Let's Make Your Celebration Special</h2>
      <p>Delicious food, professional service and complete catering solutions for your event.</p>
      <a href="/booking" class="btn">Book Your Event</a>
    </div>
  </section>`;

  res.send(
    renderPage({
      title: 'Contact',
      activeKey: 'contact',
      req,
      banner: { eyebrow: 'GET IN TOUCH', title: 'Contact Us', breadcrumb: 'Home / Contact' },
      body,
      scripts: ['/js/contact.js'],
    })
  );
});

// ---------------- API ----------------

router.post(
  '/api/contact',
  contactLimiter,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const name = str(b.name);
    const email = str(b.email).toLowerCase();
    const phone = str(b.phone);
    const subject = str(b.subject);
    const message = str(b.message);

    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (phone && !isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
    if (name.length > 100 || subject.length > 150 || message.length > 2000) {
      return res.status(400).json({ error: 'One of the fields is too long.' });
    }

    await pool.query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5)',
      [name, email, phone || null, subject || null, message]
    );
    res.status(201).json({ message: 'Message sent successfully!' });
  })
);

module.exports = router;
