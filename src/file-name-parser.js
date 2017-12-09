const dedent = require("dedent-js")

module.exports = fileName => {
  const result = /^(-?\d+)[-_]?(.*).(sql|js)$/gi.exec(fileName)

  if (!result) {
    throw new Error(dedent`
          Invalid file name: '${fileName}'.`)
  }

  const [, id, name, type] = result

  return {
    id: parseInt(id, 10),
    name: name ? name : fileName,
    type: type.toLowerCase(),
  }
}
