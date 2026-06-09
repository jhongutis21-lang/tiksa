const CO = '-5 hours';
const CO_MS = 5 * 3600000;

function colombiaNow() {
  return Date.now() - CO_MS;
}

function hoyColombia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

function fechaColombia(fecha) {
  return new Date(fecha).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

module.exports = { CO, CO_MS, colombiaNow, hoyColombia, fechaColombia };
