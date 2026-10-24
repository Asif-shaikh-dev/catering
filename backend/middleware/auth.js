function wantsJson(req) {
  return req.originalUrl.startsWith('/api/');
}

function requireCustomer(req, res, next) {
  if (req.session && req.session.customerId) return next();

  if (wantsJson(req)) {
    return res.status(401).json({ error: 'Please login to continue.' });
  }
  return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();

  if (wantsJson(req)) {
    return res.status(401).json({ error: 'Admin login required.' });
  }
  return res.redirect('/admin-login');
}

module.exports = { requireCustomer, requireAdmin };
