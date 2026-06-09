function isPositiveNumber(val) {
  return typeof val === 'number' && isFinite(val) && val > 0;
}

function isNonNegativeNumber(val) {
  return typeof val === 'number' && isFinite(val) && val >= 0;
}

function isValidPrice(val) {
  return typeof val === 'number' && isFinite(val) && val >= 0;
}

function isValidString(val, minLen = 1) {
  return typeof val === 'string' && val.trim().length >= minLen;
}

function isValidIva(val) {
  return [19, 5, 0, -1].includes(val);
}

function isValidPassword(val) {
  return typeof val === 'string' && val.length >= 6;
}

function isValidInteger(val) {
  return Number.isInteger(val) || (typeof val === 'string' && /^\d+$/.test(val));
}

function safeInt(val, def = 0) {
  const n = parseInt(val);
  return isFinite(n) ? n : def;
}

function safeFloat(val, def = 0) {
  const n = parseFloat(val);
  return isFinite(n) ? n : def;
}

module.exports = { isPositiveNumber, isNonNegativeNumber, isValidPrice, isValidString, isValidIva, isValidPassword, isValidInteger, safeInt, safeFloat };
