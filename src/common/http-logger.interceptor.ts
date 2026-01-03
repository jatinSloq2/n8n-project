import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from './logger.service';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  private readonly logger = new LoggerService();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          const logData = {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
          };

          // Log to HTTP file
          this.logger.http(`${method} ${url} ${statusCode} - ${duration}ms`, logData);

          // Console log with color-coded status
          const statusColor =
            statusCode >= 500
              ? '🔴'
              : statusCode >= 400
              ? '🟡'
              : '🟢';
          this.logger.log(`${statusColor} ${method} ${url} ${statusCode} - ${duration}ms`, 'HTTP');
        },
        error: (error: any) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          const logData = {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            ip,
            userAgent,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          };

          // Log HTTP error
          this.logger.http(
            `${method} ${url} ${statusCode} - ${duration}ms - ERROR`,
            logData
          );

          // Log to console + file with error
          this.logger.error(
            `🔴 ${method} ${url} ${statusCode} - ${duration}ms - ${error.message}`,
            error.stack,
            'HTTP'
          );
        },
      })
    );
  }
}
