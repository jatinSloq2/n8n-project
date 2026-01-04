import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Workflow, WorkflowSchema } from "./workflow.schema";
import { UsersModule } from "../users/users.module"; // ADD THIS
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";
import { WorkflowsSeedService } from "./workflows-seed.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
    ]),
    UsersModule, // ADD THIS LINE
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