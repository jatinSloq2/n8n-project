import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Job } from "bull";
import { ExecutionsService } from "./executions.service";
import { WorkflowExecutor } from "./workflow-executor.service";

@Processor("executions")
@Injectable()
export class ExecutionProcessor {
  constructor(
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly executionsService: ExecutionsService
  ) {}

  @Process("execute-workflow")
  async handleWorkflowExecution(job: Job) {
    const { executionId, workflowId, executionData, userId } = job.data;

    console.log(
      `Processing execution ${executionId} for workflow ${workflowId} (user: ${userId})`
    );

    try {
      // Pass userId to the executor
      const result = await this.workflowExecutor.execute(
        workflowId,
        executionId,
        executionData,
        userId // Add userId here
      );

      await this.executionsService.updateStatus(executionId, "success");

      console.log(`Execution ${executionId} completed successfully`);
      return result;
    } catch (error) {
      console.error(`Execution ${executionId} failed: ${error.message}`);

      await this.executionsService.updateStatus(executionId, "error", {
        message: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }
}
