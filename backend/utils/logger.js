const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const details = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return timestamp + ' [' + level.toUpperCase() + '] ' + (stack || message) + details;
    })
  ),
  transports: [new transports.Console()],
  exitOnError: false,
});

module.exports = logger;
