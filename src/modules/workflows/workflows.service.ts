import { forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Workflow, WorkflowDocument } from "./workflow.schema";
import { SchedulerService } from "../scheduler/scheduler.service";

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    @Inject(forwardRef(() => SchedulerService)) // ADD forwardRef wrapper
    private schedulerService: SchedulerService
  ) {}

  async create(createWorkflowDto: any, userId: string) {
    const workflow = new this.workflowModel({
      ...createWorkflowDto,
      userId,
    });
    return workflow.save();
  }

  async findAll(userId: string) {
    return this.workflowModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string, userId: string) {
    const workflow = await this.workflowModel
      .findOne({ _id: id, userId })
      .exec();
    if (!workflow) throw new NotFoundException("Workflow not found");
    return workflow;
  }

  async update(
    id: string,
    updateWorkflowDto: any,
    userId: string
  ): Promise<Workflow> {
    const workflow = await this.workflowModel.findOneAndUpdate(
      { _id: id, user: userId },
      updateWorkflowDto,
      { new: true }
    );

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    // Handle schedule updates
    const scheduleNode = workflow.nodes.find(
      (node) => node.type === "schedule"
    );

    if (scheduleNode) {
      if (scheduleNode.data.config?.enabled) {
        // Schedule or reschedule
        await this.schedulerService.scheduleWorkflow(
          id,
          scheduleNode.data.config,
          userId
        );
      } else {
        // Unschedule if disabled
        this.schedulerService.unscheduleWorkflow(id);
      }
    } else {
      // No schedule node, unschedule if it was scheduled
      this.schedulerService.unscheduleWorkflow(id);
    }

    return workflow;
  }

  async remove(id: string, userId: string): Promise<void> {
    const workflow = await this.workflowModel.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    // Unschedule if it was scheduled
    this.schedulerService.unscheduleWorkflow(id);
  }

  async delete(id: string, userId: string) {
    const workflow = await this.workflowModel
      .findOneAndDelete({ _id: id, userId })
      .exec();
    if (!workflow) throw new NotFoundException("Workflow not found");
    return { message: "Workflow deleted successfully" };
  }

  async activate(id: string, userId: string) {
    return this.update(id, { isActive: true }, userId);
  }

  async deactivate(id: string, userId: string) {
    return this.update(id, { isActive: false }, userId);
  }

  async duplicate(id: string, userId: string) {
    const workflow = await this.findById(id, userId);
    const duplicateWorkflow = new this.workflowModel({
      ...workflow.toObject(),
      _id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      name: `${workflow.name} (Copy)`,
    });
    return duplicateWorkflow.save();
  }

  async findByWebhookPath(path: string): Promise<WorkflowDocument | null> {
    return this.workflowModel
      .findOne({
        "nodes.type": "webhook",
        "nodes.data.config.path": path,
      })
      .exec();
  }

  async findByIdWebhook(id: string): Promise<WorkflowDocument> {
    return this.workflowModel.findById(id).exec();
  }
}
