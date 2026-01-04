import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bull";
import { ScheduleModule } from "@nestjs/schedule";

import { ExecutionsService } from "./executions.service";
import { ExecutionsController } from "./executions.controller";
import { ExecutionSchema, Execution } from "./execution.schema";
import { WorkflowExecutor } from "./workflow-executor.service";
import { ExecutionProcessor } from "./execution.processor";
import { WorkflowsModule } from "../workflows/workflows.module"; // ✅ ADD
import { WorkflowScheduler } from "./workflow-scheduler.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Execution.name, schema: ExecutionSchema },
    ]),
    BullModule.registerQueue({
      name: "executions",
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    ScheduleModule.forRoot(), // Add this
    WorkflowsModule, // ✅ REQUIRED
  ],
  controllers: [ExecutionsController],
  providers: [
    ExecutionsService,
    WorkflowExecutor,
    ExecutionProcessor,
    WorkflowScheduler,
  ],
  exports: [ExecutionsService, WorkflowExecutor, WorkflowScheduler],
})
export class ExecutionsModule {}
