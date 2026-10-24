const str = (v) => (typeof v === 'string' ? v.trim() : '');
const isEmail = (v) => v.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = (v) => /^[0-9+\-()\s]{7,20}$/.test(v) && (v.match(/\d/g) || []).length >= 7;

module.exports = { str, isEmail, isPhone };
