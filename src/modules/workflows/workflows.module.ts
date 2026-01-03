import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Workflow, WorkflowSchema } from "./workflow.schema";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
    ]),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [
    MongooseModule, // ✅ EXPORT MODEL
    WorkflowsService, // optional
  ],
})
export class WorkflowsModule {}
