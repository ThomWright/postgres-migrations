const dedent = require("dedent-js")

const parseId = id => {
  const parsed = parseInt(id, 10)
  if (isNaN(parsed)) {
    throw new Error(dedent`
      Migration file name should begin with an integer ID.'`)
  }

  return parsed
}

module.exports = fileName => {
  const result = /^(-?\d+)[-_]?(.*).(sql|js)$/gi.exec(fileName)

  if (!result) {
    throw new Error(dedent`
          Invalid file name: '${fileName}'.`)
  }

  const [, id, name, type] = result

  return {
    id: parseId(id),
    name: name ? name : fileName,
    type: type.toLowerCase(),
  }
}
