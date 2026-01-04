import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import axios, { AxiosRequestConfig } from "axios";
import * as nodemailer from "nodemailer";
import * as fs from "fs/promises";
import * as path from "path";
import { VM } from "vm2";

import { Execution, ExecutionDocument } from "./execution.schema";
import { Workflow, WorkflowDocument } from "../workflows/workflow.schema";

interface NodeOutput {
  data: any;
  metadata?: any;
}

interface ExecutionContext {
  workflow: any;
  runData: Record<string, any>;
  nodeOutputs: Record<string, NodeOutput>;
  inputData: any;
  visited: Set<string>;
}

@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name);

  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>
  ) {}

  async execute(workflowId: string, executionId: string, inputData: any = {}) {
    const workflow = await this.workflowModel.findById(workflowId);
    if (!workflow) throw new Error("Workflow not found");

    const execution = await this.executionModel.findById(executionId);
    if (!execution) throw new Error("Execution not found");

    try {
      execution.status = "running";
      await execution.save();

      const context: ExecutionContext = {
        workflow,
        runData: {},
        nodeOutputs: {},
        inputData,
        visited: new Set<string>(),
      };

      const startNode = this.findStartNode(
        workflow.nodes,
        workflow.connections
      );
      if (!startNode) throw new Error("No start node found");

      await this.executeNode(startNode, context);

      execution.status = "success";
      execution.finishedAt = new Date();
      execution.data.resultData = { runData: context.runData };
      await execution.save();

      return { success: true, executionId, data: context.runData };
    } catch (error) {
      this.logger.error(`Execution failed: ${error.message}`, error.stack);
      execution.status = "error";
      execution.finishedAt = new Date();
      execution.data.error = error.message;
      await execution.save();
      throw error;
    }
  }

  findStartNode(nodes: any[], connections: any[]) {
    const targets = new Set(connections.map((c) => c.target));
    return nodes.find((n) => !targets.has(n.id));
  }

  async executeNode(node: any, context: ExecutionContext) {
    if (context.visited.has(node.id)) {
      this.logger.debug(`Node ${node.id} already visited, skipping`);
      return context.nodeOutputs[node.id];
    }

    context.visited.add(node.id);
    const start = Date.now();

    this.logger.log(`Executing node: ${node.id} (${node.type})`);

    let output: NodeOutput = { data: {} };
    let error: Error | null = null;

    try {
      // Get input from previous nodes
      const nodeInput = this.getNodeInput(node, context);

      // Log input for debugging
      this.logger.debug(`Node ${node.id} input:`, JSON.stringify(nodeInput));

      // Execute the node
      output = await this.executeNodeByType(node, nodeInput, context);

      // Log output for debugging
      this.logger.debug(`Node ${node.id} output:`, JSON.stringify(output));
    } catch (err) {
      error = err;
      this.logger.error(`Node ${node.id} failed: ${err.message}`, err.stack);

      // Store error in output
      output = {
        data: {},
        metadata: {
          error: true,
          errorMessage: err.message,
          errorStack: err.stack,
        },
      };

      throw new Error(`Node ${node.id} (${node.type}) failed: ${err.message}`);
    } finally {
      const end = Date.now();

      // Store node output and execution data
      context.nodeOutputs[node.id] = output;
      context.runData[node.id] = {
        startTime: start,
        executionTime: end - start,
        data: output,
        nodeType: node.type,
        error: error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : null,
      };
    }

    // Handle conditional branching (IF node)
    if (node.type === "if" && output.metadata?.branch) {
      const branch = output.metadata.branch; // 'true' or 'false'
      const connectedNodes = this.getConnectedNodesByOutput(
        node.id,
        branch,
        context.workflow.connections,
        context.workflow.nodes
      );

      for (const next of connectedNodes) {
        await this.executeNode(next, context);
      }
    } else {
      // Normal flow - execute all connected nodes
      const connectedNodes = this.getConnectedNodes(
        node.id,
        context.workflow.connections,
        context.workflow.nodes
      );

      for (const next of connectedNodes) {
        await this.executeNode(next, context);
      }
    }

    return output;
  }

  // Add this helper for conditional branching
  private getConnectedNodesByOutput(
    nodeId: string,
    outputHandle: string,
    connections: any[],
    nodes: any[]
  ) {
    return connections
      .filter((c) => c.source === nodeId && c.sourceHandle === outputHandle)
      .map((c) => nodes.find((n) => n.id === c.target))
      .filter(Boolean);
  }

  private resolveExpressions(value: any, context: ExecutionContext): any {
    if (typeof value !== "string") {
      return value;
    }

    // Match patterns like {{$node.NodeName.data.field}}
    const expressionPattern = /\{\{([^}]+)\}\}/g;

    return value.replace(expressionPattern, (match, expression) => {
      const trimmed = expression.trim();

      // Handle $node references
      if (trimmed.startsWith("$node.")) {
        const parts = trimmed.split(".");
        // parts = ['$node', 'nodeId', 'data', 'field']

        if (parts.length < 3) return match;

        const nodeId = parts[1];
        const path = parts.slice(2); // ['data', 'field']

        const nodeOutput = context.nodeOutputs[nodeId];
        if (!nodeOutput) {
          this.logger.warn(`Node ${nodeId} not found in outputs`);
          return match;
        }

        // Navigate the path
        let result = nodeOutput;
        for (const key of path) {
          if (result && typeof result === "object" && key in result) {
            result = result[key];
          } else {
            return match;
          }
        }

        return result;
      }

      // Handle $input references (workflow input)
      if (trimmed.startsWith("$input.")) {
        const path = trimmed.substring(7).split(".");
        let result = context.inputData;

        for (const key of path) {
          if (result && typeof result === "object" && key in result) {
            result = result[key];
          } else {
            return match;
          }
        }

        return result;
      }

      return match;
    });
  }

  private async executeNodeByType(
    node: any,
    nodeInput: any,
    context: ExecutionContext
  ): Promise<NodeOutput> {
    // Resolve all expressions in config
    const config = this.resolveConfigExpressions(
      node.data?.config || {},
      context
    );

    switch (node.type) {
      // ============= TRIGGERS =============
      case "trigger":
        return this.executeTrigger(config, nodeInput);

      case "webhook":
        return this.executeWebhook(config, nodeInput);

      case "schedule":
        return this.executeSchedule(config, nodeInput);

      // ============= DATA NODES =============
      case "httpRequest":
        return await this.executeHttpRequest(config, nodeInput);

      case "database":
        return await this.executeDatabase(config, nodeInput);

      // ============= TRANSFORM NODES =============
      case "code":
        return await this.executeCode(config, nodeInput);

      case "set":
        return this.executeSet(config, nodeInput);

      case "function":
        return await this.executeFunction(config, nodeInput);

      case "itemLists":
        return this.executeItemLists(config, nodeInput);

      case "filter":
        return this.executeFilter(config, nodeInput);

      case "sort":
        return this.executeSort(config, nodeInput);

      case "limit":
        return this.executeLimit(config, nodeInput);

      // ============= LOGIC NODES =============
      case "if":
        return this.executeIf(config, nodeInput);

      case "switch":
        return this.executeSwitch(config, nodeInput);

      case "merge":
        return this.executeMerge(config, nodeInput, context);

      // ============= FLOW NODES =============
      case "delay":
        return await this.executeDelay(config, nodeInput);

      case "loop":
        return this.executeLoop(config, nodeInput);

      case "stopExecution":
        return this.executeStopExecution(config, nodeInput);

      // ============= COMMUNICATION NODES =============
      case "email":
        return await this.executeEmail(config, nodeInput);

      case "slack":
        return await this.executeSlack(config, nodeInput);

      // ============= FILE NODES =============
      case "readFile":
        return await this.executeReadFile(config, nodeInput);

      case "spreadsheet":
        return await this.executeSpreadsheet(config, nodeInput);

      // ============= HELPERS =============
      case "noOp":
        return { data: nodeInput };

      case "stickyNote":
        return { data: { note: config.note } };

      default:
        this.logger.warn(`Unknown node type: ${node.type}`);
        return { data: nodeInput };
    }
  }
  private resolveConfigExpressions(
    config: any,
    context: ExecutionContext
  ): any {
    if (typeof config === "string") {
      return this.resolveExpressions(config, context);
    }

    if (Array.isArray(config)) {
      return config.map((item) => this.resolveConfigExpressions(item, context));
    }

    if (typeof config === "object" && config !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(config)) {
        resolved[key] = this.resolveConfigExpressions(value, context);
      }
      return resolved;
    }

    return config;
  }

  // ============= TRIGGER IMPLEMENTATIONS =============

  private executeTrigger(config: any, input: any): NodeOutput {
    return {
      data: input || {
        triggered: true,
        timestamp: new Date(),
        triggerType: config.triggerType || "manual",
      },
    };
  }

  private executeWebhook(config: any, input: any): NodeOutput {
    return {
      data: {
        path: config.path,
        method: config.method,
        body: input,
        timestamp: new Date(),
      },
    };
  }

  private executeSchedule(config: any, input: any): NodeOutput {
    return {
      data: {
        interval: config.interval,
        timezone: config.timezone,
        executedAt: new Date(),
        ...input,
      },
    };
  }

  // ============= DATA NODE IMPLEMENTATIONS =============

  private async executeHttpRequest(
    config: any,
    input: any
  ): Promise<NodeOutput> {
    const {
      url,
      method = "GET",
      headers = {},
      body,
      timeout = 30000,
      authentication,
    } = config;

    if (!url) throw new Error("URL is required");

    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }

    const requestConfig: AxiosRequestConfig = {
      url,
      method,
      headers,
      timeout,
      data: body || input,
    };

    // Handle authentication
    if (authentication === "basicAuth" && config.username && config.password) {
      requestConfig.auth = {
        username: config.username,
        password: config.password,
      };
    } else if (authentication === "apiKey" && config.apiKey) {
      requestConfig.headers[config.apiKeyHeader || "X-API-Key"] = config.apiKey;
    }

    const response = await axios(requestConfig);

    return {
      data: response.data,
      metadata: {
        statusCode: response.status,
        headers: response.headers,
      },
    };
  }

  private async executeDatabase(config: any, input: any): Promise<NodeOutput> {
    const { dbType, operation, query } = config;

    if (!query) throw new Error("Query is required");

    // Note: You'll need to implement actual database connections
    // This is a placeholder that shows the structure
    this.logger.warn(
      "Database execution is a placeholder - implement actual DB logic"
    );

    return {
      data: {
        dbType,
        operation,
        query,
        result: [], // Placeholder for actual results
        executedAt: new Date(),
      },
    };
  }

  // ============= TRANSFORM NODE IMPLEMENTATIONS =============

  private async executeCode(config: any, input: any): Promise<NodeOutput> {
    const { code, mode = "runOnceForAllItems" } = config;

    if (!code) throw new Error("Code is required");

    const vm = new VM({
      timeout: 5000,
      sandbox: {
        items: Array.isArray(input) ? input : [input],
        console: {
          log: (...args: any[]) => this.logger.log("VM Log:", ...args),
        },
      },
    });

    try {
      const result = vm.run(code);
      return { data: result };
    } catch (error) {
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }

  private executeSet(config: any, input: any): NodeOutput {
    const { mode = "set", values = {} } = config;

    if (mode === "delete") {
      const result = { ...input };
      Object.keys(values).forEach((key) => delete result[key]);
      return { data: result };
    }

    return {
      data: {
        ...input,
        ...values,
      },
    };
  }

  private async executeFunction(config: any, input: any): Promise<NodeOutput> {
    const { functionCode } = config;

    if (!functionCode) throw new Error("Function code is required");

    const vm = new VM({
      timeout: 5000,
      sandbox: {
        items: Array.isArray(input) ? input : [input],
      },
    });

    try {
      const result = vm.run(`(${functionCode})()`);
      return { data: result };
    } catch (error) {
      throw new Error(`Function execution failed: ${error.message}`);
    }
  }

  private executeItemLists(config: any, input: any): NodeOutput {
    const { operation } = config;

    if (operation === "split") {
      const items = Array.isArray(input) ? input : [input];
      return { data: items };
    }

    if (operation === "aggregate") {
      return {
        data: Array.isArray(input) ? input : [input],
      };
    }

    return { data: input };
  }

  private executeFilter(config: any, input: any): NodeOutput {
    const { conditions = [] } = config;

    const items = Array.isArray(input) ? input : [input];

    const filtered = items.filter((item) => {
      return conditions.every((condition: any) => {
        const { field, operator, value } = condition;
        const itemValue = item[field];

        switch (operator) {
          case "equals":
            return itemValue === value;
          case "notEquals":
            return itemValue !== value;
          case "contains":
            return String(itemValue).includes(value);
          case "greaterThan":
            return itemValue > value;
          case "lessThan":
            return itemValue < value;
          default:
            return true;
        }
      });
    });

    return { data: filtered };
  }

  private executeSort(config: any, input: any): NodeOutput {
    const { sortBy, order = "ascending" } = config;

    if (!sortBy) throw new Error("Sort field is required");

    const items = Array.isArray(input) ? [...input] : [input];

    items.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal < bVal) return order === "ascending" ? -1 : 1;
      if (aVal > bVal) return order === "ascending" ? 1 : -1;
      return 0;
    });

    return { data: items };
  }

  private executeLimit(config: any, input: any): NodeOutput {
    const { maxItems = 10 } = config;

    const items = Array.isArray(input) ? input : [input];
    return { data: items.slice(0, maxItems) };
  }

  // ============= LOGIC NODE IMPLEMENTATIONS =============

  private executeIf(config: any, input: any): NodeOutput {
    const { conditions = [], combineOperation = "AND" } = config;

    let result = combineOperation === "AND";

    for (const condition of conditions) {
      const { field, operator, value } = condition;
      const itemValue = input[field];
      let conditionMet = false;

      switch (operator) {
        case "equals":
          conditionMet = itemValue === value;
          break;
        case "notEquals":
          conditionMet = itemValue !== value;
          break;
        case "contains":
          conditionMet = String(itemValue).includes(value);
          break;
        case "greaterThan":
          conditionMet = itemValue > value;
          break;
        case "lessThan":
          conditionMet = itemValue < value;
          break;
        default:
          conditionMet = true;
      }

      if (combineOperation === "AND") {
        result = result && conditionMet;
      } else {
        result = result || conditionMet;
      }
    }

    return {
      data: input,
      metadata: { conditionMet: result, branch: result ? "true" : "false" },
    };
  }

  private executeSwitch(config: any, input: any): NodeOutput {
    const { mode = "rules", rules = [] } = config;

    let outputIndex = 0;

    if (mode === "rules") {
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        // Evaluate rule logic here
        if (this.evaluateRule(rule, input)) {
          outputIndex = i;
          break;
        }
      }
    }

    return {
      data: input,
      metadata: { output: outputIndex },
    };
  }

  private evaluateRule(rule: any, input: any): boolean {
    // Implement rule evaluation logic
    return true; // Placeholder
  }

  private executeMerge(
    config: any,
    input: any,
    context: ExecutionContext
  ): NodeOutput {
    const { mode = "append" } = config;

    // Get all inputs from connected nodes
    const allInputs = Object.values(context.nodeOutputs).map((out) => out.data);

    switch (mode) {
      case "append":
        return { data: allInputs.flat() };
      case "merge":
        return { data: Object.assign({}, ...allInputs) };
      case "multiplex":
        return { data: allInputs };
      default:
        return { data: input };
    }
  }

  // ============= FLOW NODE IMPLEMENTATIONS =============

  private async executeDelay(config: any, input: any): Promise<NodeOutput> {
    const { amount = 1, unit = "seconds" } = config;

    const multipliers = {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
      days: 86400000,
    };

    const delay = amount * (multipliers[unit] || 1000);

    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      data: input,
      metadata: { delayed: `${amount} ${unit}` },
    };
  }

  private executeLoop(config: any, input: any): NodeOutput {
    const { batchSize = 1 } = config;

    const items = Array.isArray(input) ? input : [input];

    return {
      data: items,
      metadata: {
        batchSize,
        totalItems: items.length,
      },
    };
  }

  private executeStopExecution(config: any, input: any): NodeOutput {
    const { message = "Execution stopped" } = config;
    throw new Error(message);
  }

  // ============= COMMUNICATION NODE IMPLEMENTATIONS =============

  private async executeEmail(config: any, input: any): Promise<NodeOutput> {
    const {
      fromEmail,
      toEmail,
      subject,
      body,
      html = false,
      smtpHost = "smtp.gmail.com",
      smtpPort = 587,
      smtpUser,
      smtpPassword,
      authentication = "login",
    } = config;

    if (!fromEmail || !toEmail || !subject || !body) {
      throw new Error("Email requires from, to, subject, and body");
    }

    if (authentication === "login" && (!smtpUser || !smtpPassword)) {
      throw new Error("SMTP authentication requires username and password");
    }

    const transportConfig: any = {
      host: smtpHost,
      port: parseInt(smtpPort.toString()),
      secure: smtpPort === 465,
    };

    if (authentication === "login") {
      transportConfig.auth = {
        user: smtpUser,
        pass: smtpPassword,
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    const mailOptions = {
      from: fromEmail,
      to: toEmail,
      subject,
      [html ? "html" : "text"]: body,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return {
        data: {
          sent: true,
          messageId: info.messageId,
          from: fromEmail,
          to: toEmail,
          subject,
          ...input,
        },
      };
    } catch (error) {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  private async executeSlack(config: any, input: any): Promise<NodeOutput> {
    const {
      channel,
      text,
      authentication = "webhook",
      webhookUrl,
      botToken,
    } = config;

    if (!channel || !text) {
      throw new Error("Slack requires channel and text");
    }

    if (authentication === "webhook") {
      if (!webhookUrl) {
        throw new Error("Webhook URL is required for webhook authentication");
      }

      await axios.post(webhookUrl, {
        channel,
        text,
      });
    } else if (authentication === "token") {
      if (!botToken) {
        throw new Error("Bot token is required for token authentication");
      }

      await axios.post(
        "https://slack.com/api/chat.postMessage",
        {
          channel,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return {
      data: {
        sent: true,
        channel,
        text,
        ...input,
      },
    };
  }

  // ============= FILE NODE IMPLEMENTATIONS =============

  private async executeReadFile(config: any, input: any): Promise<NodeOutput> {
    const { operation = "read", filePath } = config;

    if (!filePath) throw new Error("File path is required");

    if (operation === "read") {
      const content = await fs.readFile(filePath, "utf-8");
      return {
        data: {
          content,
          filePath,
          ...input,
        },
      };
    }

    if (operation === "write") {
      const contentToWrite = input.content || JSON.stringify(input);
      await fs.writeFile(filePath, contentToWrite, "utf-8");
      return {
        data: {
          written: true,
          filePath,
          ...input,
        },
      };
    }

    return { data: input };
  }

  private async executeSpreadsheet(
    config: any,
    input: any
  ): Promise<NodeOutput> {
    const { operation = "read", filePath } = config;

    if (!filePath) throw new Error("File path is required");

    // Note: Implement actual spreadsheet library (xlsx, csv-parser, etc.)
    this.logger.warn(
      "Spreadsheet execution is a placeholder - implement actual logic"
    );

    return {
      data: {
        operation,
        filePath,
        rows: [], // Placeholder
      },
    };
  }

  // ============= HELPER METHODS =============

  private getNodeInput(node: any, context: ExecutionContext): any {
    const incoming = context.workflow.connections.filter(
      (c: any) => c.target === node.id
    );

    // If no incoming connections, use workflow input data
    if (!incoming.length) {
      return context.inputData || {};
    }

    // Get outputs from all connected source nodes
    const inputs = incoming
      .map((c: any) => {
        const sourceOutput = context.nodeOutputs[c.source];
        if (!sourceOutput) {
          this.logger.warn(`No output found for source node: ${c.source}`);
          return null;
        }
        return sourceOutput.data;
      })
      .filter(Boolean);

    // If single input, return it directly (not as array)
    if (inputs.length === 1) {
      return inputs[0];
    }

    // If multiple inputs, merge them intelligently
    if (inputs.length > 1) {
      // Check if all inputs are arrays
      const allArrays = inputs.every((input) => Array.isArray(input));
      if (allArrays) {
        return inputs.flat(); // Flatten arrays
      }

      // Check if all inputs are objects
      const allObjects = inputs.every(
        (input) => typeof input === "object" && !Array.isArray(input)
      );
      if (allObjects) {
        return Object.assign({}, ...inputs); // Merge objects
      }

      // Otherwise return as array
      return inputs;
    }

    return {};
  }

  private getConnectedNodes(nodeId: string, connections: any[], nodes: any[]) {
    return connections
      .filter((c) => c.source === nodeId)
      .map((c) => nodes.find((n) => n.id === c.target))
      .filter(Boolean);
  }
}
