import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';

import { Execution, ExecutionDocument } from './execution.schema';
import { Workflow, WorkflowDocument } from '../workflows/workflow.schema'; // You’ll need to create this schema

@Injectable()
export class WorkflowExecutor {
  constructor(
    @InjectModel(Workflow.name) private readonly workflowModel: Model<WorkflowDocument>,
    @InjectModel(Execution.name) private readonly executionModel: Model<ExecutionDocument>,
  ) {}

  async execute(workflowId: string, executionId: string, inputData: any = {}) {
    const workflow = await this.workflowModel.findById(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const execution = await this.executionModel.findById(executionId);
    if (!execution) throw new Error('Execution not found');

    const runData: Record<string, any> = {};
    const nodeOutputs: Record<string, any> = {};

    const startNode = this.findStartNode(workflow.nodes, workflow.connections);
    if (!startNode) throw new Error('No start node found');

    await this.executeNode(startNode, workflow, runData, nodeOutputs, inputData);

    execution.status = 'success';
    execution.finishedAt = new Date();
    execution.data.resultData = { runData };
    await execution.save();

    return { success: true, executionId, data: runData };
  }

  findStartNode(nodes: any[], connections: any[]) {
    const targets = new Set(connections.map(c => c.target));
    return nodes.find(n => !targets.has(n.id));
  }

  async executeNode(node: any, workflow: any, runData: any, nodeOutputs: any, inputData: any) {
    // Similar logic as your JS version
    const nodeInput = this.getNodeInput(node, workflow.connections, nodeOutputs, inputData);
    let output: any = {};

    switch (node.type) {
      case 'trigger':
        output = { data: nodeInput || { triggered: true, timestamp: new Date() } };
        break;
      case 'httpRequest':
        const { url, method = 'GET', headers = {}, body } = node.data;
        const response = await axios({ url, method, headers, data: body || nodeInput });
        output = { data: response.data, statusCode: response.status, headers: response.headers };
        break;
      case 'set':
        output = { data: { ...nodeInput, ...(node.data.values || {}) } };
        break;
      default:
        output = { data: nodeInput };
    }

    nodeOutputs[node.id] = output;
    runData[node.id] = { startTime: Date.now(), executionTime: 0, data: output };

    const connectedNodes = this.getConnectedNodes(node.id, workflow.connections, workflow.nodes);
    for (const next of connectedNodes) {
      await this.executeNode(next, workflow, runData, nodeOutputs, inputData);
    }

    return output;
  }

  getNodeInput(node: any, connections: any[], nodeOutputs: any, initialData: any) {
    const incoming = connections.filter(c => c.target === node.id);
    if (!incoming.length) return initialData;
    const inputs = incoming.map(c => nodeOutputs[c.source]?.data).filter(Boolean);
    return inputs[0] || initialData;
  }

  getConnectedNodes(nodeId: string, connections: any[], nodes: any[]) {
    return connections
      .filter(c => c.source === nodeId)
      .map(c => nodes.find(n => n.id === c.target))
      .filter(Boolean);
  }
}
