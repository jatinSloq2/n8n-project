import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Workflow, WorkflowSchema } from "./workflow.schema";
import { UsersModule } from "../users/users.module";
import { SchedulerModule } from "../scheduler/scheduler.module"; // ADD THIS
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";
import { WorkflowsSeedService } from "./workflows-seed.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
    ]),
    UsersModule,
    forwardRef(() => SchedulerModule), // ADD THIS LINE with forwardRef
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowsSeedService],
  exports: [
    MongooseModule,
    WorkflowsService,
    WorkflowsSeedService,
  ],
})
export class WorkflowsModule {}