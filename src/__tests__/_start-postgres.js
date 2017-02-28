const {execSync, spawn} = require("child_process")

const PASSWORD = "mysecretpassword"

const HEALTH_CHECK_CMD = `'export PGPASSWORD=${PASSWORD}; HOST=$(hostname --ip-address); echo "SELECT 1" | psql --host=$HOST -U postgres -q -t -A'`

module.exports = (containerName, t) => {

  const events = spawn("docker", [
    "events",
    "--filter", "type=container",
    "--filter", `container=${containerName}`,
    "--filter", "event=health_status",
  ])
  events.stdout.on("data", (data) => {
    data = data.toString()

    if (data.includes("health_status: healthy")) {
      events.kill()

      t.end()
    }
  })

  execSync(`docker run --detach --publish-all  \
    --name ${containerName} \
    --env POSTGRES_PASSWORD=${PASSWORD} \
    --health-cmd ${HEALTH_CHECK_CMD} \
    --health-interval=1s \
    --health-retries=30 \
    --health-timeout=1s \
    postgres:9.4`)

  const portMapping = execSync(`docker port ${containerName} 5432`).toString()
  const port = parseInt(portMapping.split(":")[1], 10)
  return port
}

module.exports.PASSWORD = PASSWORD
