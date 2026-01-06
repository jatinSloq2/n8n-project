import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as cron from 'node-cron';
import { ExecutionsService } from '../executions/executions.service';
import { WorkflowExecutor } from '../executions/workflow-executor.service';
import { Workflow, WorkflowDocument } from '../workflows/workflow.schema';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private scheduledTasks = new Map<string, cron.ScheduledTask>();

  constructor(
    @InjectModel(Workflow.name)
    private workflowModel: Model<WorkflowDocument>,
    private executionService: ExecutionsService,
    private workflowExecutor: WorkflowExecutor,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing Scheduler Service...');
    await this.loadScheduledWorkflows();
  }

  onModuleDestroy() {
    this.logger.log('🛑 Stopping all scheduled tasks...');
    this.scheduledTasks.forEach((task) => task.stop());
    this.scheduledTasks.clear();
  }

  async loadScheduledWorkflows() {
    try {
      const workflows = await this.workflowModel.find({}).exec();
      let scheduledCount = 0;

      for (const workflow of workflows) {
        const scheduleNode = workflow.nodes.find(
          (node) => node.type === 'schedule' && node.data.config?.enabled === true
        );

        if (scheduleNode) {
          await this.scheduleWorkflow(
            workflow._id.toString(),
            scheduleNode.data.config,
            workflow.userId.toString(), // FIXED: Changed from workflow.user to workflow.userId
          );
          scheduledCount++;
        }
      }

      this.logger.log(`✅ Loaded ${scheduledCount} scheduled workflows`);
    } catch (error) {
      this.logger.error(`Failed to load scheduled workflows: ${error.message}`);
    }
  }

  async scheduleWorkflow(workflowId: string, config: any, userId: string) {
    // Remove existing schedule if any
    this.unscheduleWorkflow(workflowId);

    const { scheduleType, interval, unit, cronExpression, timezone } = config;

    let cronPattern: string;

    try {
      if (scheduleType === 'interval') {
        cronPattern = this.intervalToCron(interval, unit);
      } else {
        cronPattern = cronExpression;
      }

      // Validate cron pattern
      if (!cron.validate(cronPattern)) {
        throw new Error(`Invalid cron pattern: ${cronPattern}`);
      }

      this.logger.log(
        `⏰ Scheduling workflow ${workflowId} with pattern: ${cronPattern}`,
      );

      const task = cron.schedule(
        cronPattern,
        async () => {
          this.logger.log(`🔔 Executing scheduled workflow: ${workflowId}`);
          try {
            // FIXED: Changed to pass separate arguments instead of object
            const execution = await this.executionService.create(
              workflowId,
              userId,
              {
                mode: 'schedule',
              }
            );

            await this.workflowExecutor.execute(
              workflowId,
              execution._id.toString(),
              {
                scheduledAt: new Date().toISOString(),
                scheduleConfig: config,
              },
              userId,
            );

            this.logger.log(`✅ Scheduled workflow ${workflowId} executed successfully`);
          } catch (error) {
            this.logger.error(
              `❌ Failed to execute scheduled workflow ${workflowId}: ${error.message}`,
            );
          }
        },
        {
          // FIXED: Removed 'scheduled: true' - not a valid option for node-cron
          timezone: timezone || 'UTC',
        },
      );

      this.scheduledTasks.set(workflowId, task);
      this.logger.log(`✅ Workflow ${workflowId} scheduled successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to schedule workflow ${workflowId}: ${error.message}`,
      );
      throw error;
    }
  }

  unscheduleWorkflow(workflowId: string) {
    const task = this.scheduledTasks.get(workflowId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(workflowId);
      this.logger.log(`🛑 Unscheduled workflow: ${workflowId}`);
    }
  }

  private intervalToCron(interval: number, unit: string): string {
    switch (unit) {
      case 'seconds':
        if (interval >= 60) {
          throw new Error('Interval in seconds must be less than 60');
        }
        return `*/${interval} * * * * *`;
      case 'minutes':
        if (interval >= 60) {
          throw new Error('Interval in minutes must be less than 60');
        }
        return `0 */${interval} * * * *`;
      case 'hours':
        if (interval >= 24) {
          throw new Error('Interval in hours must be less than 24');
        }
        return `0 0 */${interval} * * *`;
      case 'days':
        if (interval >= 31) {
          throw new Error('Interval in days must be less than 31');
        }
        return `0 0 0 */${interval} * *`;
      default:
        return `0 */${interval} * * * *`;
    }
  }

  getScheduledWorkflows(): string[] {
    return Array.from(this.scheduledTasks.keys());
  }

  isScheduled(workflowId: string): boolean {
    return this.scheduledTasks.has(workflowId);
  }
}