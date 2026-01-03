import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { InjectQueue } from "@nestjs/bull";
import { Model, Types } from "mongoose";
import { Queue } from "bull";

import {
  Execution,
  ExecutionDocument,
  ExecutionStatus,
} from "./execution.schema";
import { CreateExecutionDto } from "./dto/create-execution.dto";

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    @InjectQueue("executions")
    private readonly executionQueue: Queue
  ) {}

  async create(
    createExecutionDto: CreateExecutionDto
  ): Promise<ExecutionDocument> {
    const execution = new this.executionModel({
      ...createExecutionDto,
      workflowId: new Types.ObjectId(createExecutionDto.workflowId),
      userId: new Types.ObjectId(createExecutionDto.userId),
    });

    return execution.save();
  }

  async findAll(userId: string, filters: any = {}): Promise<Execution[]> {
    return this.executionModel
      .find({
        userId: new Types.ObjectId(userId),
        ...filters,
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("workflowId", "name")
      .exec();
  }

  async findById(id: string): Promise<Execution> {
    const execution = await this.executionModel
      .findById(new Types.ObjectId(id))
      .populate("workflowId", "name")
      .exec();

    if (!execution) throw new NotFoundException("Execution not found");
    return execution;
  }

  async findByWorkflowId(
    workflowId: string,
    userId: string
  ): Promise<Execution[]> {
    return this.executionModel
      .find({
        workflowId: new Types.ObjectId(workflowId),
        userId: new Types.ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async update(id: string, updateData: Partial<Execution>): Promise<Execution> {
    const execution = await this.executionModel
      .findByIdAndUpdate(new Types.ObjectId(id), updateData, { new: true })
      .exec();

    if (!execution) throw new NotFoundException("Execution not found");
    return execution;
  }

  async updateStatus(id: string, status: ExecutionStatus, error: any = null) {
    const updateData: Partial<Execution> = {
      status,
      finishedAt: new Date(),
    };

    if (error) updateData.error = error;

    return this.update(id, updateData);
  }

  async delete(id: string) {
    const execution = await this.executionModel
      .findByIdAndDelete(new Types.ObjectId(id))
      .exec();

    if (!execution) throw new NotFoundException("Execution not found");
    return { message: "Execution deleted successfully" };
  }

  async executeWorkflow(
    workflowId: string,
    userId: string,
    executionData: any = {}
  ) {
    const execution = await this.create({
      workflowId,
      userId,
      status: "running",
      mode: executionData.mode || "manual",
      startedAt: new Date(),
      data: { resultData: { runData: {} } },
    });

    await this.executionQueue.add("execute-workflow", {
      executionId: execution._id.toString(),
      workflowId,
      userId,
      executionData,
    });

    return execution;
  }

  async stopExecution(id: string) {
    return this.updateStatus(id, "canceled");
  }

  async getExecutionStats(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const stats = await this.executionModel.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>);
  }
}
