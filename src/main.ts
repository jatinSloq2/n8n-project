import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import compression from "compression";
import { join } from "path";

import { AppModule } from "./app.module";
import { LoggerService } from "./common/logger.service";
import { morganMiddleware } from "./common/morgan.middleware";
import { HttpLoggerInterceptor } from "./common/http-logger.interceptor";

async function bootstrap() {
  const logger = new LoggerService();

  logger.log("🚀 Starting application...", "Bootstrap");

  // Create NestJS app with NestExpressApplication type
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logger,
  });

  // Apply Morgan HTTP middleware
  app.use(morganMiddleware);

  // Apply global HTTP logger interceptor
  app.useGlobalInterceptors(new HttpLoggerInterceptor());

  // Security middleware with updated CSP for serving files
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(compression());
  logger.log("✅ Security middleware enabled", "Bootstrap");

  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
  });
  logger.log("✅ Static uploads folder served at /uploads", "Bootstrap");

  // CORS setup
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
  app.enableCors({ credentials: true });
  logger.log(`✅ CORS enabled for: ${corsOrigin}`, "Bootstrap");

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  logger.log("✅ Global validation pipe enabled", "Bootstrap");

  // Global API prefix
  app.setGlobalPrefix("api");
  logger.log("✅ Global prefix set to: /api", "Bootstrap");

  const port = process.env.PORT || 3000;
  const environment = process.env.NODE_ENV || "development";

  await app.listen(port);

  logger.log("═══════════════════════════════════════════", "Bootstrap");
  logger.log(
    `🚀 Backend server running on http://localhost:${port}`,
    "Bootstrap"
  );
  logger.log(`📚 API available at http://localhost:${port}/api`, "Bootstrap");
  logger.log(`📁 Uploads available at http://localhost:${port}/uploads`, "Bootstrap");
  logger.log(`🔧 Environment: ${environment}`, "Bootstrap");
  logger.log(`📝 Logs directory: ${process.cwd()}/logs`, "Bootstrap");
  logger.log("═══════════════════════════════════════════", "Bootstrap");
}

bootstrap().catch((err: any) => {
  const logger = new LoggerService();
  logger.error("❌ Error starting server", err.stack, "Bootstrap");
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  const logger = new LoggerService();
  logger.error("❌ Uncaught Exception", error.stack, "Process");
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  const logger = new LoggerService();
  logger.error(
    "❌ Unhandled Rejection",
    `Reason: ${reason}\nPromise: ${JSON.stringify(promise)}`,
    "Process"
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  const logger = new LoggerService();
  logger.log("👋 SIGTERM signal received: closing HTTP server", "Process");
  process.exit(0);
});

process.on("SIGINT", () => {
  const logger = new LoggerService();
  logger.log("👋 SIGINT signal received: closing HTTP server", "Process");
  process.exit(0);
});