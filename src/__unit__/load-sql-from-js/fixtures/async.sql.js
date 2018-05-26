module.exports.generateSql = () =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve(`
    -- pointless comment
    SELECT * from eggs
      WHERE color = 2
    `)
    }, 100)
  })
