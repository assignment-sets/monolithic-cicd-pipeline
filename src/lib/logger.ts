import pino from "pino";

const isServer = typeof window === "undefined";
const isNode = isServer && process.env.NEXT_RUNTIME === "nodejs";

let logger: pino.Logger;

if (isNode) {
  logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
      targets: [
        {
          target: "pino-loki",
          options: {
            // Automatically falls back to local testing if the systemd environment flag is missing
            host: process.env.MONITORING_SERVER_PRIVATE_IP
              ? `http://${process.env.MONITORING_SERVER_PRIVATE_IP}:3100`
              : "http://localhost:3100",
            labels: {
              app: "student-management-nextjs",
              env: process.env.APP_ENV || "development", // Differentiates blue vs green instances
            },
            json: true,
            batch: true,
            interval: 5,
          },
        },
        {
          target: "pino/file",
          options: { destination: 1 }, // Pipelines structural logs straight to stdout/systemd journal
        },
      ],
    },
  });
} else {
  logger = pino({
    level: process.env.LOG_LEVEL || "info",
    browser: {
      asObject: true,
    },
  });
}

export default logger;
