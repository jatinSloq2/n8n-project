import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    if (context) log += ` [${context}]`;
    log += ` ${message}`;
    if (Object.keys(meta).length > 0) log += ` ${JSON.stringify(meta)}`;
    return log;
  }),
);

// Custom format for files (JSON + timestamp + stack trace)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Daily rotate file transports
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'server-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

const errorLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: fileFormat,
});

const httpLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  format: fileFormat,
});

// Main logger for app logs
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports: [
    allLogsTransport,
    errorLogsTransport,
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

// Logger for HTTP requests
const httpLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [httpLogsTransport],
});

// NestJS-compatible logger service
export class LoggerService {
  log(message: string, context?: string, meta: Record<string, any> = {}) {
    logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta: Record<string, any> = {}) {
    logger.error(message, { trace, context, ...meta });
  }

  warn(message: string, context?: string, meta: Record<string, any> = {}) {
    logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta: Record<string, any> = {}) {
    logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta: Record<string, any> = {}) {
    logger.verbose(message, { context, ...meta });
  }

  http(message: string, meta: Record<string, any> = {}) {
    httpLogger.info(message, meta);
  }
}

export { logger, httpLogger };
