// const jsonFormater = function(json) {
const jsonFormater = (json) => {
  return JSON.stringify(json, null, 2);
};

module.exports = {
  jsonFormater
};