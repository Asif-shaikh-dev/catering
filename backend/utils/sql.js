// Join the single most relevant payment of a booking (an active Paid/Pending one first,
// otherwise the newest). Prevents duplicated booking rows when a booking has several payments.
// The bookings table must be aliased as "b" and the join result as "pay".
const LATEST_PAYMENT_JOIN = `
  LEFT JOIN LATERAL (
    SELECT id, status, method, amount FROM payments
    WHERE booking_id = b.id
    ORDER BY (status IN ('Paid','Pending')) DESC, id DESC
    LIMIT 1
  ) pay ON TRUE`;

module.exports = { LATEST_PAYMENT_JOIN };
