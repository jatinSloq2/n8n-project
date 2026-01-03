import morgan, { StreamOptions } from 'morgan';
import { httpLogger } from './logger.service';

// Custom token to calculate response time in milliseconds
morgan.token('response-time-ms', (req: any, res: any) => {
  if (!req._startAt || !res._startAt) return '0';
  const ms =
    (res._startAt[0] - req._startAt[0]) * 1000 +
    (res._startAt[1] - req._startAt[1]) / 1e6;
  return ms.toFixed(3);
});

// Create a stream object for Morgan to use
const stream: StreamOptions = {
  write: (message: string) => {
    httpLogger.info(message.trim());
  },
};

// Custom Morgan format
const morganFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time-ms ms';

// Morgan middleware instance
const morganMiddleware = morgan(morganFormat, { stream });

export { morganMiddleware };
