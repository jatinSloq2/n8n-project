const { Processor, Process } = require('@nestjs/bull');
const { Job } = require('bull');
const { WorkflowExecutor } = require('./workflow-executor.service');

@Processor('executions')
class ExecutionProcessor {
  constructor(workflowExecutor) {
    this.workflowExecutor = workflowExecutor;
  }

  @Process('execute-workflow')
  async handleWorkflowExecution(job) {
    const { executionId, workflowId, userId, executionData } = job.data;

    console.log(`Processing execution ${executionId} for workflow ${workflowId}`);

    try {
      const result = await this.workflowExecutor.execute(
        workflowId,
        executionId,
        executionData
      );

      console.log(`Execution ${executionId} completed successfully`);
      return result;

    } catch (error) {
      console.error(`Execution ${executionId} failed:`, error.message);
      throw error;
    }
  }
}

module.exports = { ExecutionProcessor };