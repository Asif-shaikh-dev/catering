// Who may view / pay for a booking?  Admins, the logged-in customer who owns it,
// or the browser session that created it (guest bookings).
function canAccessBooking(req, booking) {
  const s = req.session || {};
  if (s.adminId) return true;
  if (s.customerId && booking.customer_id === s.customerId) return true;
  return Array.isArray(s.bookingIds) && s.bookingIds.includes(booking.id);
}

module.exports = { canAccessBooking };
