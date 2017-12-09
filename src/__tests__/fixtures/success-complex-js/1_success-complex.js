const createSuccess = require("./schema/create_success")
const createDynamicTable = require("./schema/create_dynamic_table")

module.exports.generateSql = () => `
${createSuccess}
${createDynamicTable("complex")}
`
