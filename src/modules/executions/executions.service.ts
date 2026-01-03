import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model } from 'mongoose';
import { Queue } from 'bull';

import { Execution, ExecutionDocument, ExecutionStatus } from './execution.schema';

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    @InjectQueue('executions')
    private readonly executionQueue: Queue,
  ) {}

  async create(createExecutionDto: Partial<Execution>): Promise<Execution> {
    const execution = new this.executionModel(createExecutionDto);
    return execution.save();
  }

  async findAll(userId: string, filters: any = {}): Promise<Execution[]> {
    return this.executionModel
      .find({ userId, ...filters })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('workflowId', 'name')
      .exec();
  }

  async findById(id: string): Promise<Execution> {
    const execution = await this.executionModel.findById(id).populate('workflowId', 'name').exec();
    if (!execution) throw new NotFoundException('Execution not found');
    return execution;
  }

  async findByWorkflowId(workflowId: string, userId: string): Promise<Execution[]> {
    return this.executionModel
      .find({ workflowId, userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async update(id: string, updateData: Partial<Execution>): Promise<Execution> {
    const execution = await this.executionModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!execution) throw new NotFoundException('Execution not found');
    return execution;
  }

  async updateStatus(id: string, status: ExecutionStatus, error: any = null) {
    const updateData: Partial<Execution> = { status, finishedAt: new Date() };
    if (error) updateData.error = error;
    return this.update(id, updateData);
  }

  async delete(id: string) {
    const execution = await this.executionModel.findByIdAndDelete(id).exec();
    if (!execution) throw new NotFoundException('Execution not found');
    return { message: 'Execution deleted successfully' };
  }

  async executeWorkflow(workflowId: string, userId: string, executionData: any = {}) {
    const execution = await this.create({
      workflowId,
      userId,
      status: 'running',
      mode: executionData.mode || 'manual',
      startedAt: new Date(),
      data: { resultData: { runData: {} } },
    });

    await this.executionQueue.add('execute-workflow', {
      executionId: execution._id.toString(),
      workflowId,
      userId,
      executionData,
    });

    return execution;
  }

  async stopExecution(id: string) {
    return this.updateStatus(id, 'canceled');
  }

  async getExecutionStats(userId: string) {
    const stats = await this.executionModel.aggregate([
      { $match: { userId: new this.executionModel.db.base.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>);
  }
}
