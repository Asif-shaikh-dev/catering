// Create a fresh session id on login/signup (prevents session fixation) but keep
// the list of bookings a guest made earlier in this browser session.
function regenerate(req) {
  const keep = req.session && req.session.bookingIds;
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      if (keep) req.session.bookingIds = keep;
      resolve();
    });
  });
}

module.exports = { regenerate };
