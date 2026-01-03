const { Injectable, NotFoundException } = require('@nestjs/common');
const { InjectModel } = require('@nestjs/mongoose');
const { InjectQueue } = require('@nestjs/bull');
const { Model } = require('mongoose');

@Injectable()
class ExecutionsService {
  constructor(
    @InjectModel('Execution') executionModel,
    @InjectQueue('executions') executionQueue
  ) {
    this.executionModel = executionModel;
    this.executionQueue = executionQueue;
  }

  async create(createExecutionDto) {
    const execution = new this.executionModel(createExecutionDto);
    return execution.save();
  }

  async findAll(userId, filters = {}) {
    const query = { userId, ...filters };
    return this.executionModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('workflowId', 'name')
      .exec();
  }

  async findById(id) {
    const execution = await this.executionModel
      .findById(id)
      .populate('workflowId', 'name')
      .exec();
    
    if (!execution) {
      throw new NotFoundException('Execution not found');
    }
    
    return execution;
  }

  async findByWorkflowId(workflowId, userId) {
    return this.executionModel
      .find({ workflowId, userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async update(id, updateData) {
    const execution = await this.executionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    
    if (!execution) {
      throw new NotFoundException('Execution not found');
    }
    
    return execution;
  }

  async updateStatus(id, status, error = null) {
    const updateData = { 
      status,
      finishedAt: new Date()
    };
    
    if (error) {
      updateData.error = error;
    }
    
    return this.update(id, updateData);
  }

  async delete(id) {
    const execution = await this.executionModel.findByIdAndDelete(id).exec();
    if (!execution) {
      throw new NotFoundException('Execution not found');
    }
    return { message: 'Execution deleted successfully' };
  }

  async executeWorkflow(workflowId, userId, executionData = {}) {
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

  async stopExecution(id) {
    return this.updateStatus(id, 'canceled');
  }

  async getExecutionStats(userId) {
    const stats = await this.executionModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
  }
}

module.exports = { ExecutionsService };