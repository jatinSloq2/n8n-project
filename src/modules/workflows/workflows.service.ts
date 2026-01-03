import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Workflow, WorkflowDocument } from './workflow.schema';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
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
    const workflow = await this.workflowModel.findOne({ _id: id, userId }).exec();
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async update(id: string, updateWorkflowDto: any, userId: string) {
    const workflow = await this.workflowModel
      .findOneAndUpdate({ _id: id, userId }, updateWorkflowDto, { new: true })
      .exec();
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async delete(id: string, userId: string) {
    const workflow = await this.workflowModel.findOneAndDelete({ _id: id, userId }).exec();
    if (!workflow) throw new NotFoundException('Workflow not found');
    return { message: 'Workflow deleted successfully' };
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
}
