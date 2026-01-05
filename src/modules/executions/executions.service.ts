import { InjectQueue } from "@nestjs/bull";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Queue } from "bull";
import { Model } from "mongoose";
import { Workflow, WorkflowDocument } from "../workflows/workflow.schema";
import { Execution, ExecutionDocument } from "./execution.schema";

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    @InjectQueue("executions")
    private readonly executionQueue: Queue
  ) {}

  async create(workflowId: string, userId: string, executionData: any = {}) {
    const workflow = await this.workflowModel.findOne({
      _id: workflowId,
      userId,
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    const execution = new this.executionModel({
      workflowId,
      userId,
      status: "running",
      startedAt: new Date(),
      mode: executionData.mode || "manual",
      data: {
        resultData: {
          runData: {},
          nodeOutputs: {},
        },
      },
    });

    await execution.save();

    return execution;
  }

  async executeWorkflow(
    workflowId: string,
    userId: string,
    executionData: any = {}
  ) {
    // Create execution record
    const execution = await this.create(workflowId, userId, executionData);

    // Add to queue for processing
    await this.executionQueue.add("execute-workflow", {
      executionId: execution._id.toString(),
      workflowId,
      executionData,
      userId,
    });

    return {
      executionId: execution._id,
      status: "queued",
      message: "Workflow execution started",
    };
  }

  async findAll(userId: string, filters: any = {}) {
    const query: any = { userId };

    if (filters.workflowId) {
      query.workflowId = filters.workflowId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    return this.executionModel
      .find(query)
      .populate("workflowId", "name")
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100)
      .exec();
  }

  async findById(id: string) {
    const execution = await this.executionModel
      .findById(id)
      .populate("workflowId", "name nodes connections")
      .exec();

    if (!execution) {
      throw new NotFoundException("Execution not found");
    }

    return execution;
  }

  async findByWorkflowId(workflowId: string, userId: string) {
    return this.executionModel
      .find({ workflowId, userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async updateStatus(
    executionId: string,
    status: "running" | "success" | "error" | "canceled",
    error?: any
  ) {
    const execution = await this.executionModel.findById(executionId);

    if (!execution) {
      throw new NotFoundException("Execution not found");
    }

    execution.status = status;
    execution.finishedAt = new Date();

    if (error) {
      execution.error = {
        message: error.message || "Unknown error",
        stack: error.stack || "",
      };
    }

    execution.markModified("data");
    await execution.save();

    return execution;
  }

  async stopExecution(id: string) {
    const execution = await this.findById(id);

    if (execution.status === "running") {
      execution.status = "canceled";
      execution.finishedAt = new Date();
      await execution.save();

      // Try to remove from queue if still there
      const jobs = await this.executionQueue.getJobs(["waiting", "active"]);
      const job = jobs.find((j) => j.data.executionId === id);
      if (job) {
        await job.remove();
      }
    }

    return execution;
  }

  async delete(id: string) {
    const execution = await this.executionModel.findByIdAndDelete(id);

    if (!execution) {
      throw new NotFoundException("Execution not found");
    }

    return { message: "Execution deleted successfully" };
  }

  async getExecutionStats(userId: string) {
    const stats = await this.executionModel.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalExecutions = await this.executionModel.countDocuments({
      userId,
    });

    const recentExecutions = await this.executionModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("workflowId", "name")
      .exec();

    const statusMap = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average execution time
    const completedExecutions = await this.executionModel
      .find({
        userId,
        status: { $in: ["success", "error"] },
        startedAt: { $exists: true },
        finishedAt: { $exists: true },
      })
      .select("startedAt finishedAt")
      .limit(100)
      .exec();

    let avgExecutionTime = 0;
    if (completedExecutions.length > 0) {
      const totalTime = completedExecutions.reduce((acc, exec) => {
        return acc + (exec.finishedAt.getTime() - exec.startedAt.getTime());
      }, 0);
      avgExecutionTime = totalTime / completedExecutions.length;
    }

    // Success rate
    const successCount = statusMap.success || 0;
    const successRate =
      totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

    return {
      total: totalExecutions,
      byStatus: {
        running: statusMap.running || 0,
        success: statusMap.success || 0,
        error: statusMap.error || 0,
        canceled: statusMap.canceled || 0,
      },
      successRate: Math.round(successRate * 100) / 100,
      avgExecutionTime: Math.round(avgExecutionTime),
      recentExecutions: recentExecutions.map((exec) => ({
        id: exec._id,
        workflowId: exec.workflowId,
        status: exec.status,
        startedAt: exec.startedAt,
        finishedAt: exec.finishedAt,
        duration:
          exec.finishedAt && exec.startedAt
            ? exec.finishedAt.getTime() - exec.startedAt.getTime()
            : null,
      })),
    };
  }

  async retryExecution(id: string) {
    const execution = await this.findById(id);

    if (execution.status !== "error") {
      throw new Error("Can only retry failed executions");
    }

    // Create new execution with same data
    return this.executeWorkflow(
      execution.workflowId.toString(),
      execution.userId.toString(),
      execution.data
    );
  }

  async cleanupOldExecutions(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.executionModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ["success", "error", "canceled"] },
    });

    return {
      message: `Cleaned up ${result.deletedCount} old executions`,
      deletedCount: result.deletedCount,
    };
  }
}
