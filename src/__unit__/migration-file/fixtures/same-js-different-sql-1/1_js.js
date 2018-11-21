const getNumber = require("../inc")

module.exports.generateSql = () => {
  return "SELECT * FROM something; " + getNumber()
}
