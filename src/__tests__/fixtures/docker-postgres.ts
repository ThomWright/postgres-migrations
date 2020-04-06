// tslint:disable no-console

import {CbExecutionContext} from "ava"
import {execSync, spawn} from "child_process"

export const PASSWORD = "mysecretpassword"

const HEALTH_CHECK_CMD = `'export PGPASSWORD=${PASSWORD}; HOST=$(hostname --ip-address); echo "SELECT 1" | psql --host=$HOST -U postgres -q -t -A'`

export const stopPostgres = (containerName: string) => {
  try {
    execSync(`docker rm -f ${containerName}`)
  } catch (error) {
    console.log("Could not remove the Postgres container")
    throw error
  }
}

export const startPostgres = (containerName: string, t: CbExecutionContext) => {
  try {
    try {
      execSync(`docker rm -f ${containerName}`, {stdio: "ignore"})
    } catch (error) {
      //
    }

    const events = spawn("docker", [
      "events",
      "--filter",
      "type=container",
      "--filter",
      `container=${containerName}`,
      "--filter",
      "event=health_status",
    ])
    events.stdout.on("data", (data) => {
      const dataString = data.toString()

      if (dataString.includes("health_status: healthy")) {
        events.kill()

        t.end()
      }
    })
    events.on("error", (err) => {
      console.error("Error in 'docker events' process:", err)
      events.kill()
      t.fail(err.message)
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
  } catch (error) {
    console.log("Could not start Postgres", error)
    throw error
  }
}
