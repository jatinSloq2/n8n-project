import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import axios, { AxiosRequestConfig } from "axios";
import * as nodemailer from "nodemailer";
import { FilesService } from "../files/files.service";
import * as fs from "fs/promises";
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
  currentNodeId?: string;
}

interface FileContentResult {
  data: any;
  type: string;
  rowCount?: number;
  columns?: string[];
}

@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name);
  private currentUserId: string; // Add this property
  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    private readonly filesService: FilesService
  ) {}

  async execute(
    workflowId: string,
    executionId: string,
    inputData: any = {},
    userId?: string // Add userId parameter
  ) {
    this.currentUserId = userId; // Set it here

    const workflow = await this.workflowModel.findById(workflowId);
    if (!workflow) throw new Error("Workflow not found");

    const execution = await this.executionModel.findById(executionId);
    if (!execution) throw new Error("Execution not found");

    const context: ExecutionContext = {
      workflow,
      runData: {},
      nodeOutputs: {},
      inputData,
      visited: new Set<string>(),
    };

    try {
      execution.status = "running";
      execution.startedAt = new Date();
      await execution.save();

      const startNode = this.findStartNode(
        workflow.nodes,
        workflow.connections
      );
      if (!startNode) throw new Error("No start node found");

      await this.executeNode(startNode, context);

      execution.status = "success";
      execution.finishedAt = new Date();

      if (!execution.data) {
        execution.data = {
          resultData: {
            runData: {},
            nodeOutputs: {},
          },
        };
      }

      execution.data.resultData = {
        runData: context.runData,
        nodeOutputs: context.nodeOutputs,
      };

      execution.markModified("data");
      await execution.save();

      this.logger.log(`✅ Execution ${executionId} completed successfully`);
      return { success: true, executionId, data: context.runData };
    } catch (error) {
      this.logger.error(`❌ Execution failed: ${error.message}`, error.stack);

      execution.status = "error";
      execution.finishedAt = new Date();

      if (!execution.data) {
        execution.data = {
          resultData: {
            runData: {},
            nodeOutputs: {},
          },
        };
      }

      execution.data.error = error.message;
      execution.data.resultData = {
        runData: context.runData,
        nodeOutputs: context.nodeOutputs,
      };

      execution.markModified("data");
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
    context.currentNodeId = node.id;
    const start = Date.now();

    this.logger.log(`🔵 Executing node: ${node.id} (${node.type})`);

    let output: NodeOutput = { data: {} };
    let error: Error | null = null;

    try {
      const nodeInput = this.getNodeInput(node, context);

      this.logger.log(
        `📥 Node ${node.id} INPUT:`,
        JSON.stringify(nodeInput, null, 2)
      );

      output = await this.executeNodeByType(node, nodeInput, context);

      this.logger.log(
        `📤 Node ${node.id} OUTPUT:`,
        JSON.stringify(output, null, 2)
      );
    } catch (err) {
      error = err;
      this.logger.error(`❌ Node ${node.id} failed: ${err.message}`, err.stack);

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

    // Handle conditional branching
    if (node.type === "if" && output.metadata?.branch) {
      const branch = output.metadata.branch;
      this.logger.log(`🔀 IF node branching to: ${branch}`);

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

  private async executeUploadFile(
    config: any,
    input: any
  ): Promise<NodeOutput> {
    const { fileId } = config;

    if (!fileId) {
      throw new Error("File ID is required");
    }

    if (!this.currentUserId) {
      throw new Error("User ID is required to access uploaded files");
    }

    try {
      // Get raw file buffer from FilesService
      const fileBuffer = await this.filesService.getFileContent(
        fileId,
        this.currentUserId
      );

      // Parse the file based on its type
      const fileContentResult = await this.parseFileContent(fileBuffer, fileId);

      this.logger.log(`📤 Uploaded file processed: ${fileContentResult.type}`);

      return {
        data: fileContentResult.data,
        metadata: {
          type: fileContentResult.type,
          rowCount: fileContentResult.rowCount,
          columns: fileContentResult.columns,
          fileId: fileId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to process uploaded file: ${error.message}`);
      throw new Error(`Failed to process file ${fileId}: ${error.message}`);
    }
  }

  private async parseFileContent(
    buffer: Buffer,
    fileId: string
  ): Promise<FileContentResult> {
    // Get file metadata to determine type
    const file = await this.filesService.getFileById(fileId, this.currentUserId);

    if (!file) {
      throw new Error("File not found");
    }

    const fileType = file.mimetype;
    const fileName = file.filename;

    // Parse based on file type
    if (fileType === "text/csv" || fileName.endsWith(".csv")) {
      return this.parseCSV(buffer);
    } else if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileType === "application/vnd.ms-excel" ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls")
    ) {
      return this.parseExcel(buffer);
    } else if (fileType === "application/json" || fileName.endsWith(".json")) {
      return this.parseJSON(buffer);
    } else if (fileType?.startsWith("text/") || fileName.endsWith(".txt")) {
      return {
        data: buffer.toString("utf-8"),
        type: "text",
      };
    } else {
      // Return raw buffer for other file types
      return {
        data: buffer,
        type: "binary",
      };
    }
  }

  // CSV parser helper
  private parseCSV(buffer: Buffer): FileContentResult {
    const Papa = require("papaparse");
    const csvText = buffer.toString("utf-8");

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    return {
      data: result.data,
      type: "csv",
      rowCount: result.data.length,
      columns: result.meta.fields || [],
    };
  }

  // Excel parser helper
  private parseExcel(buffer: Buffer): FileContentResult {
    const XLSX = require("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return {
      data: data,
      type: "excel",
      rowCount: data.length,
      columns: columns,
    };
  }

  // JSON parser helper
  private parseJSON(buffer: Buffer): FileContentResult {
    const jsonText = buffer.toString("utf-8");
    const data = JSON.parse(jsonText);

    return {
      data: data,
      type: "json",
      rowCount: Array.isArray(data) ? data.length : undefined,
      columns:
        Array.isArray(data) && data.length > 0
          ? Object.keys(data[0])
          : undefined,
    };
  }

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

    const expressionPattern = /\{\{([^}]+)\}\}/g;

    return value.replace(expressionPattern, (match, expression) => {
      const trimmed = expression.trim();

      // Handle $node references - UPDATED LOGIC
      if (trimmed.startsWith("$node.")) {
        const parts = trimmed.split(".");
        if (parts.length < 3) return match;

        const nodeIdentifier = parts[1]; // Could be "code_1" or "node-1767543799718"
        const path = parts.slice(2);

        // Try to find node by exact ID first
        let nodeOutput = context.nodeOutputs[nodeIdentifier];

        // If not found, try to find by node type and index
        if (!nodeOutput) {
          // Extract type and index from identifier like "code_1" or "ai_1"
          const typeMatch = nodeIdentifier.match(/^([a-zA-Z]+)_?(\d*)$/);
          if (typeMatch) {
            const [, nodeType, indexStr] = typeMatch;
            const index = indexStr ? parseInt(indexStr) - 1 : 0;

            // Find all nodes of this type
            const nodesOfType = Object.entries(context.nodeOutputs)
              .filter(([id, output]) => {
                const node = context.workflow.nodes.find(
                  (n: any) => n.id === id
                );
                return node && node.type === nodeType;
              })
              .map(([id]) => id);

            // Get the node at the specified index
            if (nodesOfType.length > index) {
              nodeOutput = context.nodeOutputs[nodesOfType[index]];
              this.logger.log(
                `Resolved ${nodeIdentifier} to node ${nodesOfType[index]}`
              );
            }
          }
        }

        if (!nodeOutput) {
          this.logger.warn(`Node ${nodeIdentifier} not found in outputs`);
          return match;
        }

        // Navigate through the path
        let result = nodeOutput;
        for (const key of path) {
          // Handle array indices like data[0]
          const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
          if (arrayMatch) {
            const [, prop, idx] = arrayMatch;
            result = result?.[prop]?.[parseInt(idx)];
          } else if (result && typeof result === "object" && key in result) {
            result = result[key];
          } else {
            this.logger.warn(`Path ${path.join(".")} not found in node output`);
            return match;
          }
        }

        return result !== undefined ? result : match;
      }

      // Add support for $prev (previous node)
      if (trimmed.startsWith("$prev.")) {
        const path = trimmed.substring(6).split(".");

        // Get the current node's incoming connections
        const incoming = context.workflow.connections.filter(
          (c: any) => c.target === context.currentNodeId
        );

        if (incoming.length > 0) {
          const prevNodeId = incoming[0].source;
          const prevOutput = context.nodeOutputs[prevNodeId];

          if (prevOutput) {
            let result = prevOutput;
            for (const key of path) {
              const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
              if (arrayMatch) {
                const [, prop, idx] = arrayMatch;
                result = result?.[prop]?.[parseInt(idx)];
              } else if (
                result &&
                typeof result === "object" &&
                key in result
              ) {
                result = result[key];
              } else {
                return match;
              }
            }
            return result !== undefined ? result : match;
          }
        }
      }

      // Handle $input references
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

      // Handle built-in functions
      if (trimmed === "$now") {
        return new Date().toISOString();
      }

      if (trimmed === "$timestamp") {
        return Date.now();
      }

      if (trimmed === "$uuid") {
        return require("crypto").randomUUID();
      }

      if (trimmed.startsWith("$random(") && trimmed.endsWith(")")) {
        const args = trimmed.substring(8, trimmed.length - 1).split(",");
        const min = parseInt(args[0]) || 0;
        const max = parseInt(args[1]) || 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      return match;
    });
  }

  private async executeNodeByType(
    node: any,
    nodeInput: any,
    context: ExecutionContext
  ): Promise<NodeOutput> {
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

      // ============= AI NODES =============
      case "aiChat":
        return await this.executeAIChat(config, nodeInput);
      case "aiTextGeneration":
        return await this.executeAITextGeneration(config, nodeInput);
      case "aiImageAnalysis":
        return await this.executeAIImageAnalysis(config, nodeInput);
      case "aiSentiment":
        return await this.executeAISentiment(config, nodeInput);

      // ============= DATA NODES =============
      case "httpRequest":
        return await this.executeHttpRequest(config, nodeInput);
      case "database":
        return await this.executeDatabase(config, nodeInput);
      case "jsonParse":
        return this.executeJSONParse(config, nodeInput);
      case "dataMapper":
        return this.executeDataMapper(config, nodeInput);
      case "aggregate":
        return this.executeAggregate(config, nodeInput);
      case "uploadFile":
        return await this.executeUploadFile(config, nodeInput);
      // ============= TRANSFORM NODES =============
      case "code":
        return await this.executeCode(config, nodeInput);
      case "set":
        return this.executeSet(config, nodeInput);
      case "function":
        return await this.executeFunction(config, nodeInput);
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
      case "loop":
        return this.executeLoop(config, nodeInput);

      // ============= FLOW NODES =============
      case "delay":
        return await this.executeDelay(config, nodeInput);

      // ============= COMMUNICATION NODES =============
      case "email":
        return await this.executeEmail(config, nodeInput);
      case "slack":
        return await this.executeSlack(config, nodeInput);

      // ============= FILE NODES =============
      case "readFile":
        return await this.executeReadFile(config, nodeInput);

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

  // ============= AI NODE IMPLEMENTATIONS =============

  private async executeAIChat(config: any, input: any): Promise<NodeOutput> {
    const {
      provider,
      model,
      apiKey,
      systemPrompt,
      prompt,
      temperature,
      maxTokens,
    } = config;

    if (!prompt) throw new Error("Prompt is required");

    // ✅ Check if input is an array of items to process
    const isArrayInput = Array.isArray(input);
    const items = isArrayInput ? input : [input];

    // ✅ Process each item individually if array
    if (isArrayInput && items.length > 1) {
      const results = [];

      for (const item of items) {
        // Resolve prompt for this specific item
        const resolvedPrompt = this.resolveItemExpressions(prompt, item);
        const resolvedSystemPrompt = systemPrompt
          ? this.resolveItemExpressions(systemPrompt, item)
          : "You are a helpful assistant.";

        this.logger.log(`🤖 AI Chat processing item: ${JSON.stringify(item)}`);

        // Make AI call for this individual item
        const aiResult = await this.makeAICall(
          provider,
          model,
          apiKey,
          resolvedSystemPrompt,
          resolvedPrompt,
          temperature,
          maxTokens
        );

        results.push({
          ...item,
          response: aiResult.response,
          model: aiResult.model,
        });
      }

      return { data: results };
    }

    // ✅ Single item processing (existing logic)
    const resolvedPrompt = this.resolveItemExpressions(prompt, items[0]);
    const resolvedSystemPrompt = systemPrompt
      ? this.resolveItemExpressions(systemPrompt, items[0])
      : "You are a helpful assistant.";

    const aiResult = await this.makeAICall(
      provider,
      model,
      apiKey,
      resolvedSystemPrompt,
      resolvedPrompt,
      temperature,
      maxTokens
    );

    return {
      data: {
        ...items[0],
        response: aiResult.response,
        model: aiResult.model,
      },
    };
  }

  // ✅ Extract AI call logic into separate method
  private async makeAICall(
    provider: string,
    model: string,
    apiKey: string,
    systemPrompt: string,
    prompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<{ response: string; model: string; usage?: any }> {
    let response;

    try {
      if (provider === "openai") {
        if (!apiKey) throw new Error("API key is required for OpenAI");

        response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: model || "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: temperature || 0.7,
            max_tokens: maxTokens || 1000,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        return {
          response: response.data.choices[0].message.content,
          model: response.data.model,
          usage: response.data.usage,
        };
      } else if (provider === "anthropic") {
        if (!apiKey) throw new Error("API key is required for Anthropic");

        response = await axios.post(
          "https://api.anthropic.com/v1/messages",
          {
            model: model || "claude-3-5-sonnet-20241022",
            max_tokens: maxTokens || 1000,
            messages: [{ role: "user", content: prompt }],
            ...(systemPrompt && { system: systemPrompt }),
            temperature: temperature || 0.7,
          },
          {
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
          }
        );

        return {
          response: response.data.content[0].text,
          model: response.data.model,
          usage: response.data.usage,
        };
      } else if (provider === "ollama") {
        const ollamaUrl = "http://localhost:11434";

        response = await axios.post(
          `${ollamaUrl}/api/generate`,
          {
            model: model || "llama3.2",
            prompt: systemPrompt
              ? `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
              : prompt,
            stream: false,
            options: {
              temperature: temperature || 0.7,
              num_predict: maxTokens || 1000,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        return {
          response: response.data.response,
          model: model || "llama3.2",
        };
      } else if (provider === "groq") {
        if (!apiKey) throw new Error("API key is required for Groq");

        response = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: model || "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: temperature || 0.7,
            max_tokens: maxTokens || 1000,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        return {
          response: response.data.choices[0].message.content,
          model: response.data.model,
          usage: response.data.usage,
        };
      }

      throw new Error(`Unsupported AI provider: ${provider}`);
    } catch (error) {
      if (error.response) {
        throw new Error(
          `AI API Error (${error.response.status}): ${
            error.response.data?.error?.message ||
            error.response.data?.message ||
            JSON.stringify(error.response.data)
          }`
        );
      } else if (error.request) {
        throw new Error(`No response from AI API: ${error.message}`);
      } else {
        throw new Error(`AI request setup error: ${error.message}`);
      }
    }
  }

  private async executeAITextGeneration(
    config: any,
    input: any
  ): Promise<NodeOutput> {
    const { provider, apiKey, contentType, prompt, tone } = config;

    const enhancedPrompt = `Generate ${contentType} content with a ${tone} tone: ${prompt}`;

    return this.executeAIChat(
      {
        provider,
        apiKey,
        model: provider === "openai" ? "gpt-4" : "claude-3-opus-20240229",
        prompt: enhancedPrompt,
        systemPrompt: `You are an expert content writer. Generate high-quality ${contentType} content.`,
      },
      input
    );
  }

  private async executeAIImageAnalysis(
    config: any,
    input: any
  ): Promise<NodeOutput> {
    const { provider, apiKey, imageUrl, analysisType, customPrompt } = config;

    if (!imageUrl) throw new Error("Image URL is required");

    const prompts = {
      describe: "Describe this image in detail.",
      ocr: "Extract all text from this image.",
      objects: "List all objects you can see in this image.",
      custom: customPrompt || "Analyze this image.",
    };

    if (provider === "openai") {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompts[analysisType] },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        data: {
          analysis: response.data.choices[0].message.content,
          imageUrl,
          analysisType,
          ...input,
        },
      };
    }

    throw new Error(`Unsupported provider for image analysis: ${provider}`);
  }

  private async executeAISentiment(
    config: any,
    input: any
  ): Promise<NodeOutput> {
    const { text, detailedAnalysis } = config;

    if (!text) throw new Error("Text is required for sentiment analysis");

    const positive = [
      "good",
      "great",
      "excellent",
      "happy",
      "love",
      "wonderful",
    ];
    const negative = ["bad", "terrible", "awful", "hate", "sad", "poor"];

    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter((w) => positive.includes(w)).length;
    const negativeCount = words.filter((w) => negative.includes(w)).length;

    let sentiment = "neutral";
    let score = 0;

    if (positiveCount > negativeCount) {
      sentiment = "positive";
      score = (positiveCount / words.length) * 100;
    } else if (negativeCount > positiveCount) {
      sentiment = "negative";
      score = -(negativeCount / words.length) * 100;
    }

    return {
      data: {
        text,
        sentiment,
        score,
        confidence: Math.abs(score) > 5 ? "high" : "low",
        ...(detailedAnalysis && {
          details: {
            positiveCount,
            negativeCount,
            totalWords: words.length,
          },
        }),
        ...input,
      },
    };
  }

  // ============= DATA NODE IMPLEMENTATIONS =============

  private executeJSONParse(config: any, input: any): NodeOutput {
    const { operation, jsonPath } = config;

    if (operation === "parse") {
      const jsonString =
        typeof input === "string" ? input : JSON.stringify(input);
      return { data: JSON.parse(jsonString) };
    }

    if (operation === "stringify") {
      return { data: JSON.stringify(input, null, 2) };
    }

    if (operation === "extract" && jsonPath) {
      const parts = jsonPath.replace(/^\$\./, "").split(".");
      let result = input;
      for (const part of parts) {
        if (result && typeof result === "object") {
          result = result[part];
        }
      }
      return { data: result };
    }

    return { data: input };
  }

  private executeDataMapper(config: any, input: any): NodeOutput {
    const { mappings, keepUnmapped } = config;

    const items = Array.isArray(input) ? input : [input];
    const mapped = items.map((item) => {
      const result: any = keepUnmapped ? { ...item } : {};

      for (const [targetField, sourceField] of Object.entries(mappings)) {
        if (typeof sourceField === "string") {
          const parts = sourceField.split(".");
          let value = item;
          for (const part of parts) {
            value = value?.[part];
          }
          result[targetField] = value;
        }
      }

      return result;
    });

    return { data: Array.isArray(input) ? mapped : mapped[0] };
  }

  private executeAggregate(config: any, input: any): NodeOutput {
    const { operation, field, groupByField } = config;

    const items = Array.isArray(input) ? input : [input];

    if (operation === "sum") {
      const sum = items.reduce(
        (acc, item) => acc + (Number(item[field]) || 0),
        0
      );
      return { data: { sum, field } };
    }

    if (operation === "average") {
      const sum = items.reduce(
        (acc, item) => acc + (Number(item[field]) || 0),
        0
      );
      return { data: { average: sum / items.length, field } };
    }

    if (operation === "count") {
      return { data: { count: items.length } };
    }

    if (operation === "min") {
      const min = Math.min(...items.map((item) => Number(item[field]) || 0));
      return { data: { min, field } };
    }

    if (operation === "max") {
      const max = Math.max(...items.map((item) => Number(item[field]) || 0));
      return { data: { max, field } };
    }

    if (operation === "groupBy" && groupByField) {
      const grouped = items.reduce((acc, item) => {
        const key = item[groupByField];
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
      return { data: grouped };
    }

    return { data: input };
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

  // ============= HTTP REQUEST =============

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
      queryParameters = {},
      retryOnFail = false,
      retryCount = 3,
    } = config;

    if (!url) throw new Error("URL is required");

    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }

    const urlObj = new URL(url);
    Object.entries(queryParameters).forEach(([key, value]) => {
      urlObj.searchParams.append(key, String(value));
    });

    const requestConfig: AxiosRequestConfig = {
      url: urlObj.toString(),
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
    } else if (authentication === "bearerToken" && config.token) {
      requestConfig.headers["Authorization"] = `Bearer ${config.token}`;
    } else if (authentication === "apiKey" && config.apiKey) {
      requestConfig.headers[config.apiKeyHeader || "X-API-Key"] = config.apiKey;
    }

    // Retry logic
    let lastError;
    const maxAttempts = retryOnFail ? retryCount : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios(requestConfig);

        return {
          data: response.data,
          metadata: {
            statusCode: response.status,
            headers: response.headers,
            attempt,
          },
        };
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          this.logger.warn(`Retry attempt ${attempt} for ${url}`);
        }
      }
    }

    throw lastError;
  }

  // ============= DATABASE =============

  private async executeDatabase(config: any, input: any): Promise<NodeOutput> {
    const { dbType, operation, query } = config;

    if (!query) throw new Error("Query is required");

    this.logger.warn(
      "Database execution is a placeholder - implement actual DB logic"
    );

    return {
      data: {
        dbType,
        operation,
        query,
        result: [],
        executedAt: new Date(),
      },
    };
  }

  // ============= CODE & FUNCTION =============

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
      // Wrap the user's code in a function
      const wrappedCode = `
      (function() {
        const items = this.items;
        ${code}
      }).call({ items: this.items })
    `;

      const result = vm.run(wrappedCode);
      return { data: result !== undefined ? result : input };
    } catch (error) {
      throw new Error(`Code execution failed: ${error.message}`);
    }
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

  // ============= TRANSFORM NODES =============

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

  // ============= LOGIC NODES =============

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
    return true;
  }

  private executeMerge(
    config: any,
    input: any,
    context: ExecutionContext
  ): NodeOutput {
    const { mode = "append" } = config;

    const allInputs = Object.values(context.nodeOutputs).map((out) => out.data);

    switch (mode) {
      case "append":
        return { data: allInputs.flat() };
      case "merge":
        return { data: Object.assign({}, ...allInputs) };
      default:
        return { data: input };
    }
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

  private async executeDelay(config: any, input: any): Promise<NodeOutput> {
    const { amount = 1, unit = "seconds" } = config;

    const multipliers = {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
    };

    const delay = amount * (multipliers[unit] || 1000);

    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      data: input,
      metadata: { delayed: `${amount} ${unit}` },
    };
  }

  // ============= COMMUNICATION NODES =============

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
    } = config;

    if (!fromEmail || !subject || !body) {
      throw new Error("Email requires from, subject, and body");
    }

    // ✅ Handle both single object and array inputs
    let items: any[] = [];

    if (Array.isArray(input)) {
      items = input;
    } else if (typeof input === "object" && input !== null) {
      // Check if it's an object with numeric keys (from AI Chat output)
      const keys = Object.keys(input);
      const isNumericObject = keys.every((k) => !isNaN(Number(k)));

      if (isNumericObject) {
        // Convert {0: {...}, 1: {...}} to [{...}, {...}]
        items = Object.values(input).filter(
          (v) => typeof v === "object" && v !== null
        );
      } else {
        // Single object
        items = [input];
      }
    } else {
      items = [input];
    }

    // Filter out non-user objects (like 'response', 'model', etc.)
    items = items.filter(
      (item) => item && typeof item === "object" && (item.email || item.name) // Has user-like properties
    );

    if (items.length === 0) {
      throw new Error("No valid items to send emails to");
    }

    const transportConfig: any = {
      host: smtpHost,
      port: parseInt(smtpPort.toString()),
      secure: smtpPort === 465,
    };

    if (smtpUser && smtpPassword) {
      transportConfig.auth = {
        user: smtpUser,
        pass: smtpPassword,
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);
    const results = [];

    for (const item of items) {
      // ✅ Resolve expressions for each individual item
      const resolvedToEmail =
        this.resolveItemExpressions(toEmail, item) || item.email;
      const resolvedSubject = this.resolveItemExpressions(subject, item);
      const resolvedBody = this.resolveItemExpressions(body, item);

      // Skip if no recipient
      if (!resolvedToEmail) {
        this.logger.warn(
          `Skipping email - no recipient for item: ${JSON.stringify(item)}`
        );
        continue;
      }

      const mailOptions = {
        from: fromEmail,
        to: resolvedToEmail,
        subject: resolvedSubject,
        [html ? "html" : "text"]: resolvedBody,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        results.push({
          sent: true,
          messageId: info.messageId,
          from: fromEmail,
          to: resolvedToEmail,
          subject: resolvedSubject,
          item: item,
        });

        this.logger.log(`✉️ Email sent to ${resolvedToEmail}`);
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${resolvedToEmail}: ${error.message}`
        );
        results.push({
          sent: false,
          error: error.message,
          to: resolvedToEmail,
          item: item,
        });
      }
    }

    return {
      data: {
        emails: results,
        totalSent: results.filter((r) => r.sent).length,
        totalFailed: results.filter((r) => !r.sent).length,
      },
    };
  }

  // ✅ Enhanced helper method with support for $item, $prev, and direct property access
  private resolveItemExpressions(value: string, item: any): string {
    if (typeof value !== "string") return value;

    const expressionPattern = /\{\{([^}]+)\}\}/g;

    return value.replace(expressionPattern, (match, expression) => {
      const trimmed = expression.trim();

      // Handle $item references (current item in loop)
      if (trimmed.startsWith("$item.")) {
        const path = trimmed.substring(6).split(".");
        let result = item;

        for (const key of path) {
          if (result && typeof result === "object" && key in result) {
            result = result[key];
          } else {
            return match;
          }
        }

        return result !== undefined ? result : match;
      }

      // ✅ Handle $prev references (alias for $item)
      if (trimmed.startsWith("$prev.")) {
        const path = trimmed.substring(6);

        // Handle $prev.data.email → access item directly
        if (path.startsWith("data.")) {
          const field = path.substring(5); // Remove "data."
          return item[field] !== undefined ? item[field] : match;
        }

        // Handle $prev.email → direct field access
        return item[path] !== undefined ? item[path] : match;
      }

      return match;
    });
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
        throw new Error("Webhook URL is required");
      }

      await axios.post(webhookUrl, {
        channel,
        text,
      });
    } else if (authentication === "token") {
      if (!botToken) {
        throw new Error("Bot token is required");
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

  // ============= FILE NODES =============

  private async executeReadFile(config: any, input: any): Promise<NodeOutput> {
    const {
      operation = "read",
      filePath,
      encoding = "utf-8",
      content,
    } = config;

    if (!filePath) throw new Error("File path is required");

    // Check if filePath is a file ID (from upload node)
    if (filePath.match(/^[0-9a-fA-F]{24}$/)) {
      if (!this.currentUserId) {
        throw new Error("User ID is required to access uploaded files");
      }

      // It's a MongoDB ObjectId (uploaded file)
      const fileBuffer = await this.filesService.getFileContent(
        filePath,
        this.currentUserId
      );

      const fileContentResult = await this.parseFileContent(
        fileBuffer,
        filePath
      );

      return {
        data: fileContentResult.data,
        metadata: {
          type: fileContentResult.type,
          source: "uploaded",
          rowCount: fileContentResult.rowCount,
          columns: fileContentResult.columns,
        },
      };
    }

    // Otherwise, treat as file system path
    if (operation === "read") {
      const fileContent = await fs.readFile(filePath, encoding);
      return {
        data: {
          content: fileContent,
          filePath,
          encoding,
          ...input,
        },
      };
    }

    if (operation === "write") {
      const contentToWrite = content || input.content || JSON.stringify(input);
      await fs.writeFile(filePath, contentToWrite, encoding);
      return {
        data: {
          written: true,
          filePath,
          ...input,
        },
      };
    }

    if (operation === "append") {
      const contentToAppend = content || input.content || JSON.stringify(input);
      await fs.appendFile(filePath, contentToAppend, encoding);
      return {
        data: {
          appended: true,
          filePath,
          ...input,
        },
      };
    }

    return { data: input };
  }

  // ============= HELPER METHODS =============

  private getNodeInput(node: any, context: ExecutionContext): any {
    const incoming = context.workflow.connections.filter(
      (c: any) => c.target === node.id
    );

    if (!incoming.length) {
      return context.inputData || {};
    }

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

    if (inputs.length === 1) {
      return inputs[0];
    }

    if (inputs.length > 1) {
      const allArrays = inputs.every((input) => Array.isArray(input));
      if (allArrays) {
        return inputs.flat();
      }

      const allObjects = inputs.every(
        (input) => typeof input === "object" && !Array.isArray(input)
      );
      if (allObjects) {
        return Object.assign({}, ...inputs);
      }

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
