import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulerService } from './scheduler.service';
import { Workflow, WorkflowSchema } from '../workflows/workflow.schema';
import { ExecutionsModule } from '../executions/executions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
    ]),
    forwardRef(() => ExecutionsModule), // ADD forwardRef here too
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}