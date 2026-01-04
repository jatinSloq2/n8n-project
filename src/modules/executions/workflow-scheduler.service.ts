// workflow-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Workflow, WorkflowDocument } from '../workflows/workflow.schema';
import { ExecutionsService } from './executions.service';

@Injectable()
export class WorkflowScheduler {
  private readonly logger = new Logger(WorkflowScheduler.name);
  private schedules: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    private readonly executionsService: ExecutionsService,
  ) {}

  async onModuleInit() {
    // Load all scheduled workflows on startup
    await this.loadScheduledWorkflows();
  }

  private async loadScheduledWorkflows() {
    const workflows = await this.workflowModel.find({ active: true }).exec();
    
    for (const workflow of workflows) {
      const scheduleNode = workflow.nodes?.find(
        node => node.type === 'schedule' && node.data?.config?.enabled
      );
      
      if (scheduleNode) {
        this.scheduleWorkflow(workflow._id.toString(), scheduleNode.data.config);
      }
    }
  }

  scheduleWorkflow(workflowId: string, config: any) {
    // Clear existing schedule if any
    this.unscheduleWorkflow(workflowId);

    const { interval, unit = 'minutes', cronExpression } = config;

    if (cronExpression) {
      // Use cron expression
      this.scheduleCron(workflowId, cronExpression);
    } else if (interval && unit) {
      // Use interval-based scheduling
      this.scheduleInterval(workflowId, interval, unit);
    }
  }

  private scheduleInterval(workflowId: string, interval: number, unit: string) {
    const multipliers: Record<string, number> = {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
      days: 86400000,
    };

    const ms = interval * (multipliers[unit] || 60000);

    const timeoutId = setInterval(async () => {
      this.logger.log(`Executing scheduled workflow: ${workflowId}`);
      try {
        const workflow = await this.workflowModel.findById(workflowId);
        if (workflow && workflow.isActive) {
          await this.executionsService.executeWorkflow(
            workflowId,
            workflow.userId.toString(),
            { mode: 'scheduled' }
          );
        } else {
          this.unscheduleWorkflow(workflowId);
        }
      } catch (error) {
        this.logger.error(`Scheduled execution failed for ${workflowId}:`, error);
      }
    }, ms);

    this.schedules.set(workflowId, timeoutId);
    this.logger.log(`Scheduled workflow ${workflowId} every ${interval} ${unit}`);
  }

  private scheduleCron(workflowId: string, cronExpression: string) {
    // You would use a proper cron library here
    // This is a simplified example
    this.logger.log(`Scheduled workflow ${workflowId} with cron: ${cronExpression}`);
  }

  unscheduleWorkflow(workflowId: string) {
    const timeoutId = this.schedules.get(workflowId);
    if (timeoutId) {
      clearInterval(timeoutId);
      this.schedules.delete(workflowId);
      this.logger.log(`Unscheduled workflow: ${workflowId}`);
    }
  }

  onModuleDestroy() {
    // Clean up all schedules
    for (const [workflowId, timeoutId] of this.schedules.entries()) {
      clearInterval(timeoutId);
    }
    this.schedules.clear();
  }
}