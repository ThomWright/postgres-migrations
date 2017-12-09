const dedent = require("dedent-js")

module.exports.generateSql = () => dedent`
-- pointless comment
SELECT * from eggs
  WHERE color = 2
`
