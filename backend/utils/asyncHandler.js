// Express 4 does not catch rejected promises in async route handlers - the server
// would crash (or the request would hang). Wrap every async route with this.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
