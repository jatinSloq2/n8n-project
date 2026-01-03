import { ExecutionStatus } from '../execution.schema';

export class CreateExecutionDto {
  workflowId: string;
  userId: string;
  status?: ExecutionStatus;
  mode?: string;
  startedAt?: Date;
  finishedAt?: Date;
  data?: any;
  error?: { message: string; stack: string };
}