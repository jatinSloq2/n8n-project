import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { ExecutionSchema, Execution } from './execution.schema';
import { WorkflowExecutor } from './workflow-executor.service';
import { ExecutionProcessor } from './execution.processor';
import { WorkflowsModule } from '../workflows/workflows.module'; // ✅ ADD

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Execution.name, schema: ExecutionSchema },
    ]),
    BullModule.registerQueue({
      name: 'executions',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    WorkflowsModule, // ✅ REQUIRED
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, WorkflowExecutor, ExecutionProcessor],
  exports: [ExecutionsService, WorkflowExecutor],
})
export class ExecutionsModule {}
