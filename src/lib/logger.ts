import pino from 'pino';

const isServer = typeof window === 'undefined';
const isNode = isServer && process.env.NEXT_RUNTIME === 'nodejs';

let logger: pino.Logger;

if (isNode) {
  logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      targets: [
        {
          target: 'pino-loki',
          options: {
            host: process.env.LOKI_HOST || process.env.LOKI_URL || 'http://localhost:3100',
            labels: { app: 'student-management-nextjs' },
            json: true,
            batch: true,
            interval: 5,
          }
        },
        {
          target: 'pino/file',
          options: { destination: 1 } // Write to stdout (console)
        }
      ]
    }
  });
} else {
  logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    browser: {
      asObject: true
    }
  });
}

export default logger;
