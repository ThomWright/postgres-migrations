const dedent = require("dedent-js")

module.exports.generateSql = () => dedent`
CREATE TABLE success (
  id integer
);
`
