require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { renderMessagePage } = require('./backend/templates/layout');

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET must be set when NODE_ENV=production.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1); // needed for secure cookies behind a proxy (Render, Nginx, ...)

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// NOTE: the default MemoryStore forgets all logins when the server restarts and is not meant for
// production. For a real deployment use connect-pg-simple (stores sessions in PostgreSQL).
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 4, // 4 hours
      httpOnly: true,
      sameSite: 'lax', // blocks cross-site POST/PUT/DELETE (basic CSRF protection)
      secure: isProd,
    },
  })
);

app.use('/css', express.static(path.join(__dirname, 'frontend/css')));
app.use('/js', express.static(path.join(__dirname, 'frontend/js')));
app.use('/images', express.static(path.join(__dirname, 'frontend/images')));

// Each module owns both its page routes and its /api routes - see backend/modules/*.js
app.use('/', require('./backend/modules/pages'));
app.use('/', require('./backend/modules/auth'));
app.use('/', require('./backend/modules/admin'));
app.use('/', require('./backend/modules/menu'));
app.use('/', require('./backend/modules/packages'));
app.use('/', require('./backend/modules/services'));
app.use('/', require('./backend/modules/bookings'));
app.use('/', require('./backend/modules/payments'));
app.use('/', require('./backend/modules/customers'));
// app.use('/', require('./backend/modules/orders'));
app.use('/',require('./backend/modules/orders'));

// 404
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.status(404).send(
    renderMessagePage({
      req,
      title: 'Page not found',
      heading: '404 - Page Not Found',
      message: 'The page you are looking for does not exist.',
      linkHref: '/',
      linkLabel: 'Go back home',
    })
  );
});

// Central error handler (every async route forwards errors here via asyncHandler)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const isApi = req.originalUrl.startsWith('/api/');

  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });

  if (isApi) return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  res.status(500).send(
    renderMessagePage({
      req,
      title: 'Error',
      heading: '500 - Something went wrong',
      message: 'Please try again in a moment.',
      linkHref: '/',
      linkLabel: 'Go back home',
    })
  );
});

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Catering Management System running at http://localhost:${PORT}`);
});
