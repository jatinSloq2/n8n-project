const { Injectable } = require('@nestjs/common');
const { InjectModel } = require('@nestjs/mongoose');
const { Model } = require('mongoose');
const axios = require('axios');

@Injectable()
class WorkflowExecutor {
  constructor(
    @InjectModel('Workflow') workflowModel,
    @InjectModel('Execution') executionModel
  ) {
    this.workflowModel = workflowModel;
    this.executionModel = executionModel;
  }

  async execute(workflowId, executionId, inputData = {}) {
    try {
      const workflow = await this.workflowModel.findById(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const execution = await this.executionModel.findById(executionId);
      if (!execution) {
        throw new Error('Execution not found');
      }

      const runData = {};
      const nodeOutputs = {};

      // Find start node (node with no incoming connections)
      const startNode = this.findStartNode(workflow.nodes, workflow.connections);
      
      if (!startNode) {
        throw new Error('No start node found in workflow');
      }

      // Execute nodes in order
      await this.executeNode(
        startNode,
        workflow,
        runData,
        nodeOutputs,
        inputData
      );

      // Update execution with results
      execution.status = 'success';
      execution.finishedAt = new Date();
      execution.data.resultData.runData = runData;
      await execution.save();

      return {
        success: true,
        executionId: executionId,
        data: runData,
      };

    } catch (error) {
      // Update execution with error
      const execution = await this.executionModel.findById(executionId);
      if (execution) {
        execution.status = 'error';
        execution.finishedAt = new Date();
        execution.error = {
          message: error.message,
          stack: error.stack,
        };
        await execution.save();
      }

      throw error;
    }
  }

  findStartNode(nodes, connections) {
    const targetNodeIds = new Set(connections.map(c => c.target));
    return nodes.find(node => !targetNodeIds.has(node.id));
  }

  async executeNode(node, workflow, runData, nodeOutputs, inputData) {
    console.log(`Executing node: ${node.id} (${node.type})`);

    try {
      let output;

      // Get input from previous nodes
      const nodeInput = this.getNodeInput(node, workflow.connections, nodeOutputs, inputData);

      // Execute based on node type
      switch (node.type) {
        case 'trigger':
          output = await this.executeTriggerNode(node, nodeInput);
          break;
        case 'httpRequest':
          output = await this.executeHttpRequestNode(node, nodeInput);
          break;
        case 'code':
          output = await this.executeCodeNode(node, nodeInput);
          break;
        case 'set':
          output = await this.executeSetNode(node, nodeInput);
          break;
        case 'if':
          output = await this.executeIfNode(node, nodeInput);
          break;
        case 'merge':
          output = await this.executeMergeNode(node, nodeInput);
          break;
        case 'filter':
          output = await this.executeFilterNode(node, nodeInput);
          break;
        default:
          output = { data: nodeInput };
      }

      // Store node output
      nodeOutputs[node.id] = output;
      runData[node.id] = {
        startTime: Date.now(),
        executionTime: 0,
        data: output,
      };

      // Execute connected nodes
      const connectedNodes = this.getConnectedNodes(node.id, workflow.connections, workflow.nodes);
      
      for (const nextNode of connectedNodes) {
        await this.executeNode(nextNode, workflow, runData, nodeOutputs, inputData);
      }

      return output;

    } catch (error) {
      runData[node.id] = {
        startTime: Date.now(),
        executionTime: 0,
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
      throw error;
    }
  }

  getNodeInput(node, connections, nodeOutputs, initialData) {
    const incomingConnections = connections.filter(c => c.target === node.id);
    
    if (incomingConnections.length === 0) {
      return initialData;
    }

    const inputs = incomingConnections.map(conn => {
      const sourceOutput = nodeOutputs[conn.source];
      return sourceOutput ? sourceOutput.data : null;
    }).filter(Boolean);

    return inputs.length > 0 ? inputs[0] : initialData;
  }

  getConnectedNodes(nodeId, connections, nodes) {
    const outgoingConnections = connections.filter(c => c.source === nodeId);
    return outgoingConnections
      .map(conn => nodes.find(n => n.id === conn.target))
      .filter(Boolean);
  }

  // Node Executors

  async executeTriggerNode(node, input) {
    return {
      data: input || { triggered: true, timestamp: new Date() },
    };
  }

  async executeHttpRequestNode(node, input) {
    const { url, method = 'GET', headers = {}, body } = node.data;

    try {
      const response = await axios({
        method,
        url,
        headers,
        data: body || input,
      });

      return {
        data: response.data,
        statusCode: response.status,
        headers: response.headers,
      };
    } catch (error) {
      throw new Error(`HTTP Request failed: ${error.message}`);
    }
  }

  async executeCodeNode(node, input) {
    const { code } = node.data;
    
    try {
      const func = new Function('input', code);
      const result = func(input);
      return { data: result };
    } catch (error) {
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }

  async executeSetNode(node, input) {
    const { values = {} } = node.data;
    return {
      data: {
        ...input,
        ...values,
      },
    };
  }

  async executeIfNode(node, input) {
    const { condition, value1, value2, operation = '==' } = node.data;
    
    let result = false;
    
    switch (operation) {
      case '==':
        result = value1 == value2;
        break;
      case '!=':
        result = value1 != value2;
        break;
      case '>':
        result = value1 > value2;
        break;
      case '<':
        result = value1 < value2;
        break;
      case '>=':
        result = value1 >= value2;
        break;
      case '<=':
        result = value1 <= value2;
        break;
    }

    return {
      data: input,
      condition: result,
    };
  }

  async executeMergeNode(node, input) {
    return {
      data: Array.isArray(input) ? input : [input],
    };
  }

  async executeFilterNode(node, input) {
    const { filterBy, filterValue } = node.data;
    
    if (!Array.isArray(input)) {
      return { data: [] };
    }

    const filtered = input.filter(item => {
      return item[filterBy] === filterValue;
    });

    return { data: filtered };
  }
}

module.exports = { WorkflowExecutor };