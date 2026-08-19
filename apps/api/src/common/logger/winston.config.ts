import * as winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export function createWinstonConfig(): winston.LoggerOptions {
  const isProduction = process.env['NODE_ENV'] === 'production';

  return {
    level: process.env['LOG_LEVEL'] ?? (isProduction ? 'info' : 'debug'),
    format: isProduction
      ? combine(
          timestamp(),
          errors({ stack: true }),
          json(),
        )
      : combine(
          colorize(),
          timestamp({ format: 'HH:mm:ss' }),
          errors({ stack: true }),
          simple(),
        ),
    transports: [
      new winston.transports.Console({
        silent: process.env['NODE_ENV'] === 'test',
      }),
    ],
    // IMPORTANT: Never log sensitive fields
    // passwords, OTPs, tokens are scrubbed by never passing them to logger
  };
}
