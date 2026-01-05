import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";

import { WorkflowsModule } from "../workflows/workflows.module";
import { ExecutionProcessor } from "./execution.processor";
import { Execution, ExecutionSchema } from "./execution.schema";
import { ExecutionsController } from "./executions.controller";
import { ExecutionsService } from "./executions.service";
import { WorkflowExecutor } from "./workflow-executor.service";
import { WorkflowScheduler } from "./workflow-scheduler.service";
import { FilesModule } from "../files/files.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Execution.name, schema: ExecutionSchema },
    ]),
    BullModule.registerQueue({
      name: "executions",
    }),
    ScheduleModule.forRoot(),
    WorkflowsModule,
    FilesModule,
  ],
  controllers: [ExecutionsController],
  providers: [
    ExecutionsService,
    WorkflowExecutor,
    ExecutionProcessor,
    WorkflowScheduler,
  ],
  exports: [
    MongooseModule,
    ExecutionsService,
    WorkflowExecutor,
    WorkflowScheduler,
  ],
})
export class ExecutionsModule {}