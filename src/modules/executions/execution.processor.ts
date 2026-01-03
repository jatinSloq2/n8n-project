import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { WorkflowExecutor } from './workflow-executor.service';

@Processor('executions')
@Injectable()
export class ExecutionProcessor {
  constructor(private readonly workflowExecutor: WorkflowExecutor) {}

  @Process('execute-workflow')
  async handleWorkflowExecution(job: Job) {
    const { executionId, workflowId, userId, executionData } = job.data;

    console.log(`Processing execution ${executionId} for workflow ${workflowId}`);

    try {
      const result = await this.workflowExecutor.execute(workflowId, executionId, executionData);
      console.log(`Execution ${executionId} completed successfully`);
      return result;
    } catch (error) {
      console.error(`Execution ${executionId} failed:`, error.message);
      throw error;
    }
  }
}
